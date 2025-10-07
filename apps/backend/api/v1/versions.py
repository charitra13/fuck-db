"""
Dictionary Versions API endpoints for FuckDB Backend.
Handles version management for data dictionaries.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Path, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from bson import ObjectId
from pymongo.errors import PyMongoError
from core.config import settings
from core.db import get_mongodb, get_authenticated_supabase
from core.security import get_current_user, get_user_id
from core.logger import get_logger
from models.dictionary import (
    Dictionary,
    DictionaryVersion,
    CreateVersionRequest,
    UpdateVersionRequest,
    VersionResponse,
    Schema,
    Table,
    Column,
    TableType,
    ColumnKey
)
from utils.response import success_response, error_response
from utils.errors import NotFoundError, ValidationError, DatabaseError

logger = get_logger(__name__)

router = APIRouter()


# =============================
# Helper Functions
# =============================
def get_user_supabase(request: Request) -> Any:
    """Get authenticated Supabase client from request."""
    # First try to get token from cookie (web app)
    token = request.cookies.get("session")
    
    # If not in cookie, try Authorization header (API clients)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    return get_authenticated_supabase(token)


def verify_project_access(project_id: str, user_id: str, supabase_client) -> bool:
    """Verify user has access to the project."""
    try:
        response = supabase_client.table("projects").select("id").eq("id", project_id).eq("owner_id", user_id).execute()
        return len(response.data) > 0
    except Exception as e:
        logger.error(f"Error verifying project access: {e}")
        return False


def create_initial_schema() -> List[Schema]:
    """Create default schema structure for new dictionaries."""
    # Create a default public schema with sample table
    sample_table = Table(
        name="sample_table",
        schema_name="public",
        table_type=TableType.DIMENSION,
        description="Sample table - you can modify or delete this",
        columns=[
            Column(
                name="id",
                data_type="bigint",
                key=ColumnKey.PRIMARY,
                nullable=False,
                description="Primary key"
            ),
            Column(
                name="name",
                data_type="varchar",
                length=255,
                nullable=True,
                description="Name field"
            ),
            Column(
                name="created_at",
                data_type="timestamp",
                nullable=False,
                default_value="CURRENT_TIMESTAMP",
                description="Record creation timestamp"
            )
        ]
    )
    
    return [
        Schema(
            name="public",
            description="Default public schema",
            tables=[sample_table]
        )
    ]


# =============================
# Version Management Endpoints
# =============================
@router.get("/projects/{project_id}/versions")
async def list_versions(
    project_id: str = Path(..., description="Project ID"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """List all dictionary versions for a project."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get versions from Supabase
        response = supabase_client.table("dictionary_versions") \
            .select("*") \
            .eq("project_id", project_id) \
            .order("version", desc=True) \
            .execute()
        
        versions = response.data if response.data else []
        
        return success_response(
            data={"versions": versions},
            message=f"Found {len(versions)} versions"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing versions: {e}")
        return error_response(str(e), status_code=500)


@router.post("/projects/{project_id}/versions")
async def create_version(
    project_id: str = Path(..., description="Project ID"),
    version_data: CreateVersionRequest = None,
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Create a new dictionary version for a project."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB instance
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        # Get next version number
        latest_version = supabase_client.table("dictionary_versions") \
            .select("version") \
            .eq("project_id", project_id) \
            .order("version", desc=True) \
            .limit(1) \
            .execute()
        
        next_version = 1
        if latest_version.data and len(latest_version.data) > 0:
            next_version = latest_version.data[0]["version"] + 1
        
        # Handle base version copying
        schemas = version_data.schemas if version_data.schemas else create_initial_schema()
        relationships = []
        erd = {
            "nodes": [],
            "edges": []
        }
        
        if version_data.base_version:
            # Copy from existing version
            base_version_data = supabase_client.table("dictionary_versions") \
                .select("mongo_id") \
                .eq("project_id", project_id) \
                .eq("version", version_data.base_version) \
                .single() \
                .execute()
            
            if base_version_data.data:
                base_mongo_doc = mongodb.dictionaries.find_one({"_id": ObjectId(base_version_data.data["mongo_id"])})
                if base_mongo_doc:
                    # If copying from base version, use its structure
                    schemas_data = base_mongo_doc.get("schemas", {})
                    relationships = base_mongo_doc.get("relationships", [])
                    erd = base_mongo_doc.get("erd", {"nodes": [], "edges": []})
        
        # Convert schemas to proper format for MongoDB
        if schemas and isinstance(schemas, list) and hasattr(schemas[0], 'model_dump'):
            # schemas is a list of Schema objects - extract all tables
            all_tables = []
            for schema in schemas:
                all_tables.extend([table.model_dump(by_alias=True, exclude_none=True) for table in schema.tables])
            schemas_dict = {
                "tables": all_tables,
                "relationships": []
            }
        elif isinstance(schemas, dict):
            # Already in dict format (from base version)
            schemas_dict = schemas
        else:
            # Empty or invalid
            schemas_dict = {
                "tables": [],
                "relationships": []
            }
        
        # Create dictionary document for MongoDB
        dictionary_doc = {
            "projectId": project_id,
            "version": next_version,
            "name": version_data.name,
            "description": version_data.description,
            "schemas": schemas_dict,
            "relationships": relationships,
            "erd": erd,
            "metadata": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into MongoDB
        mongo_result = mongodb.dictionaries.insert_one(dictionary_doc)
        mongo_id = str(mongo_result.inserted_id)
        
        # Update all previous versions to not be latest
        supabase_client.table("dictionary_versions") \
            .update({"is_latest": False}) \
            .eq("project_id", project_id) \
            .execute()
        
        # Insert version metadata into Supabase
        version_metadata = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "version": next_version,
            "mongo_id": mongo_id,
            "name": version_data.name,
            "description": version_data.description,
            "is_latest": True,
            "metadata": {},
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase_result = supabase_client.table("dictionary_versions").insert(version_metadata).execute()
        
        # Return the full dictionary data as expected by frontend
        dictionary_doc["_id"] = mongo_id
        if "created_at" in dictionary_doc and hasattr(dictionary_doc["created_at"], "isoformat"):
            dictionary_doc["created_at"] = dictionary_doc["created_at"].isoformat()
        if "updated_at" in dictionary_doc and hasattr(dictionary_doc["updated_at"], "isoformat"):
            dictionary_doc["updated_at"] = dictionary_doc["updated_at"].isoformat()
        
        return success_response(
            data={
                "version": supabase_result.data[0] if supabase_result.data else version_metadata,
                "dictionary": dictionary_doc
            },
            message=f"Version {next_version} created successfully"
        )
    
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error creating version: {e}")
        return error_response(f"Database error: {str(e)}", status_code=500)
    except Exception as e:
        logger.error(f"Error creating version: {e}")
        return error_response(str(e), status_code=500)


@router.get("/projects/{project_id}/versions/latest")
async def get_latest_version(
    project_id: str = Path(..., description="Project ID"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Get the latest dictionary version for a project with full dictionary data."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get latest version from Supabase without raising if none
        latest = supabase_client.table("dictionary_versions") \
            .select("*") \
            .eq("project_id", project_id) \
            .eq("is_latest", True) \
            .limit(1) \
            .execute()

        rows = latest.data or []
        if len(rows) == 0:
            # No versions exist, return empty response
            return success_response(
                data={
                    "version": None,
                    "dictionary": None
                },
                message="No versions found for this project"
            )

        latest_row = rows[0]
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(latest_row["mongo_id"])})
        
        if dictionary:
            # Convert ObjectId to string
            dictionary["_id"] = str(dictionary["_id"])
            # Ensure datetime fields are ISO format strings
            if "created_at" in dictionary and hasattr(dictionary["created_at"], "isoformat"):
                dictionary["created_at"] = dictionary["created_at"].isoformat()
            if "updated_at" in dictionary and hasattr(dictionary["updated_at"], "isoformat"):
                dictionary["updated_at"] = dictionary["updated_at"].isoformat()
        
        return success_response(
            data={
                "version": latest_row,
                "dictionary": dictionary
            },
            message="Latest version retrieved successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting latest version: {e}")
        return error_response(str(e), status_code=500)


@router.get("/projects/{project_id}/versions/{version}")
async def get_specific_version(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Get a specific dictionary version with full dictionary data."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get version from Supabase
        version_data = supabase_client.table("dictionary_versions") \
            .select("*") \
            .eq("project_id", project_id) \
            .eq("version", version) \
            .single() \
            .execute()
        
        if not version_data.data:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(version_data.data["mongo_id"])})
        
        if dictionary:
            dictionary["_id"] = str(dictionary["_id"])
            if "created_at" in dictionary and hasattr(dictionary["created_at"], "isoformat"):
                dictionary["created_at"] = dictionary["created_at"].isoformat()
            if "updated_at" in dictionary and hasattr(dictionary["updated_at"], "isoformat"):
                dictionary["updated_at"] = dictionary["updated_at"].isoformat()
        
        return success_response(
            data={
                "version": version_data.data,
                "dictionary": dictionary
            },
            message=f"Version {version} retrieved successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting version {version}: {e}")
        return error_response(str(e), status_code=500)


@router.put("/projects/{project_id}/versions/{version}")
async def update_version(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    update_data: UpdateVersionRequest = None,
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Update a dictionary version (name, description, or full dictionary data)."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get version from Supabase
        version_data = supabase_client.table("dictionary_versions") \
            .select("*") \
            .eq("project_id", project_id) \
            .eq("version", version) \
            .single() \
            .execute()
        
        if not version_data.data:
            raise NotFoundError(f"Version {version} not found")
        
        # Update Supabase metadata if name or description changed
        if update_data.name or update_data.description:
            supabase_updates = {}
            if update_data.name:
                supabase_updates["name"] = update_data.name
            if update_data.description:
                supabase_updates["description"] = update_data.description
            
            supabase_client.table("dictionary_versions") \
                .update(supabase_updates) \
                .eq("id", version_data.data["id"]) \
                .execute()
        
        # Update MongoDB if dictionary data changed
        if any([update_data.schemas, update_data.relationships, update_data.erd, update_data.metadata]):
            mongodb = get_mongodb()
            if not mongodb:
                raise DatabaseError("MongoDB connection not available")
            
            mongo_updates = {"updated_at": datetime.utcnow()}
            
            if update_data.schemas is not None:
                # Convert schemas to proper format for MongoDB
                if update_data.schemas and isinstance(update_data.schemas, list):
                    all_tables = []
                    for schema in update_data.schemas:
                        if hasattr(schema, 'tables'):
                            all_tables.extend([table.model_dump(by_alias=True, exclude_none=True) if hasattr(table, 'model_dump') else table for table in schema.tables])
                    mongo_updates["schemas"] = {
                        "tables": all_tables,
                        "relationships": []
                    }
                else:
                    mongo_updates["schemas"] = {
                        "tables": [],
                        "relationships": []
                    }
            if update_data.relationships is not None:
                mongo_updates["relationships"] = [r.model_dump(by_alias=True, exclude_none=True) if hasattr(r, 'model_dump') else r for r in update_data.relationships]
            if update_data.erd is not None:
                erd_data = update_data.erd.model_dump(by_alias=True, exclude_none=True) if hasattr(update_data.erd, 'model_dump') else update_data.erd
                # Ensure ERD has required fields
                if not isinstance(erd_data, dict):
                    erd_data = {"nodes": [], "edges": []}
                if "nodes" not in erd_data:
                    erd_data["nodes"] = []
                if "edges" not in erd_data:
                    erd_data["edges"] = []
                mongo_updates["erd"] = erd_data
            if update_data.metadata is not None:
                mongo_updates["metadata"] = update_data.metadata
            if update_data.name:
                mongo_updates["name"] = update_data.name
            if update_data.description:
                mongo_updates["description"] = update_data.description
            
            mongodb.dictionaries.update_one(
                {"_id": ObjectId(version_data.data["mongo_id"])},
                {"$set": mongo_updates}
            )
        
        return success_response(
            data={"version": version},
            message=f"Version {version} updated successfully"
        )
    
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error updating version: {e}")
        return error_response(f"Database error: {str(e)}", status_code=500)
    except Exception as e:
        logger.error(f"Error updating version: {e}")
        return error_response(str(e), status_code=500)


@router.delete("/projects/{project_id}/versions/{version}")
async def delete_version(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete a dictionary version (cannot delete the only/latest version)."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Check if this is the only version
        all_versions = supabase_client.table("dictionary_versions") \
            .select("version, is_latest, mongo_id") \
            .eq("project_id", project_id) \
            .execute()
        
        if not all_versions.data or len(all_versions.data) == 0:
            raise NotFoundError("No versions found")
        
        if len(all_versions.data) == 1:
            raise ValidationError("Cannot delete the only version")
        
        # Find the version to delete
        version_to_delete = None
        for v in all_versions.data:
            if v["version"] == version:
                version_to_delete = v
                break
        
        if not version_to_delete:
            raise NotFoundError(f"Version {version} not found")
        
        # If deleting the latest version, make the previous version latest
        if version_to_delete["is_latest"]:
            # Find the next highest version
            sorted_versions = sorted([v for v in all_versions.data if v["version"] != version], 
                                    key=lambda x: x["version"], 
                                    reverse=True)
            if sorted_versions:
                supabase_client.table("dictionary_versions") \
                    .update({"is_latest": True}) \
                    .eq("project_id", project_id) \
                    .eq("version", sorted_versions[0]["version"]) \
                    .execute()
        
        # Delete from MongoDB
        mongodb = get_mongodb()
        if mongodb is not None:
            mongodb.dictionaries.delete_one({"_id": ObjectId(version_to_delete["mongo_id"])})
        
        # Delete from Supabase
        supabase_client.table("dictionary_versions") \
            .delete() \
            .eq("project_id", project_id) \
            .eq("version", version) \
            .execute()
        
        return success_response(
            data={"deleted_version": version},
            message=f"Version {version} deleted successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting version: {e}")
        return error_response(str(e), status_code=500)
