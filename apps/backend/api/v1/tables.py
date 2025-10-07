"""
Tables API endpoints for FuckDB Backend.
Handles table-level operations for data dictionaries.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Path, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pymongo.errors import PyMongoError
from core.security import get_current_user, get_user_id
from core.db import get_mongodb, get_authenticated_supabase
from core.logger import get_logger
from models.dictionary import (
    Table,
    TableRequest,
    Column,
    TableType,
    ColumnKey
)
from utils.response import success_response, error_response
from utils.errors import NotFoundError, ValidationError, DatabaseError, ConflictError

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


def get_version_mongo_id(project_id: str, version: int, supabase_client) -> Optional[str]:
    """Get MongoDB ID for a specific version."""
    try:
        response = supabase_client.table("dictionary_versions") \
            .select("mongo_id") \
            .eq("project_id", project_id) \
            .eq("version", version) \
            .single() \
            .execute()
        
        if response.data:
            return response.data["mongo_id"]
        return None
    except Exception as e:
        logger.error(f"Error getting version mongo_id: {e}")
        return None


# =============================
# Table Management Endpoints
# =============================
@router.get("/projects/{project_id}/versions/{version}/tables")
async def list_tables(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    schema_name: Optional[str] = Query("public", description="Schema name to filter tables"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """List all tables in a dictionary version."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB ID for the version
        mongo_id = get_version_mongo_id(project_id, version, supabase_client)
        if not mongo_id:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(mongo_id)})
        if not dictionary:
            raise NotFoundError("Dictionary not found in MongoDB")
        
        # Extract tables from the specified schema
        tables = []
        schemas_data = dictionary.get("schemas", {})
        
        # Handle the new structure where schemas is a dict with tables array
        if isinstance(schemas_data, dict) and "tables" in schemas_data:
            # Filter tables by schema_name if provided
            all_tables = schemas_data.get("tables", [])
            if schema_name:
                tables = [t for t in all_tables if t.get("schema_name") == schema_name]
            else:
                tables = all_tables
        
        return success_response(
            data={
                "tables": tables,
                "schema": schema_name,
                "count": len(tables)
            },
            message=f"Found {len(tables)} tables in schema {schema_name}"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing tables: {e}")
        return error_response(str(e), status_code=500)


@router.post("/projects/{project_id}/versions/{version}/tables")
async def create_table(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    table_data: TableRequest = None,
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Create a new table in dictionary version."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB ID for the version
        mongo_id = get_version_mongo_id(project_id, version, supabase_client)
        if not mongo_id:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(mongo_id)})
        if not dictionary:
            raise NotFoundError("Dictionary not found in MongoDB")
        
        # Check if table already exists
        schemas_data = dictionary.get("schemas", {})
        
        # Ensure schemas_data has the correct structure
        if not isinstance(schemas_data, dict) or "tables" not in schemas_data:
            schemas_data = {"tables": [], "relationships": []}
        
        # Check for duplicate table name
        for table in schemas_data.get("tables", []):
            if table.get("name") == table_data.name and table.get("schema_name") == table_data.schema_name:
                raise ConflictError(f"Table '{table_data.name}' already exists in schema '{table_data.schema_name}'")
        
        # Create new table
        new_table = table_data.model_dump(by_alias=True, exclude_none=True)
        
        # Add default columns if none provided
        if not new_table.get("columns"):
            new_table["columns"] = [
                {
                    "name": "id",
                    "data_type": "bigint",
                    "key": "PK",
                    "nullable": False,
                    "description": "Primary key",
                    "is_unique": True,
                    "is_indexed": True
                }
            ]
        
        # Add the table to the schemas
        schemas_data["tables"].append(new_table)
        
        # Update MongoDB
        result = mongodb.dictionaries.update_one(
            {"_id": ObjectId(mongo_id)},
            {
                "$set": {
                    "schemas": schemas_data,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise DatabaseError("Failed to create table")
        
        return success_response(
            data={"table": new_table},
            message=f"Table '{table_data.name}' created successfully in schema '{table_data.schema_name}'"
        )
    
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error creating table: {e}")
        return error_response(f"Database error: {str(e)}", status_code=500)
    except Exception as e:
        logger.error(f"Error creating table: {e}")
        return error_response(str(e), status_code=500)


@router.patch("/projects/{project_id}/versions/{version}/tables/{table_name}")
async def update_table(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    table_name: str = Path(..., description="Table name"),
    table_data: TableRequest = None,
    schema_name: str = Query("public", description="Schema name"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Update an existing table in dictionary version."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB ID for the version
        mongo_id = get_version_mongo_id(project_id, version, supabase_client)
        if not mongo_id:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(mongo_id)})
        if not dictionary:
            raise NotFoundError("Dictionary not found in MongoDB")
        
        # Find and update the table
        schemas_data = dictionary.get("schemas", {})
        table_found = False
        
        # Ensure schemas_data has the correct structure
        if not isinstance(schemas_data, dict) or "tables" not in schemas_data:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        tables = schemas_data.get("tables", [])
        for i, table in enumerate(tables):
            if table.get("name") == table_name and table.get("schema_name") == schema_name:
                # Update table properties
                updated_table = table_data.model_dump(by_alias=True, exclude_none=True)
                # Preserve existing columns if not provided
                if "columns" not in updated_table or not updated_table["columns"]:
                    updated_table["columns"] = table.get("columns", [])
                
                # Check if renaming to an existing table name
                if updated_table["name"] != table_name:
                    for other_table in tables:
                        if other_table.get("name") == updated_table["name"] and other_table.get("schema_name") == schema_name:
                            raise ConflictError(f"Table '{updated_table['name']}' already exists")
                
                tables[i] = updated_table
                table_found = True
                break
        
        if not table_found:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        # Update MongoDB
        result = mongodb.dictionaries.update_one(
            {"_id": ObjectId(mongo_id)},
            {
                "$set": {
                    "schemas": schemas_data,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise DatabaseError("Failed to update table")
        
        return success_response(
            data={"table": table_data.model_dump(by_alias=True, exclude_none=True)},
            message=f"Table '{table_name}' updated successfully"
        )
    
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error updating table: {e}")
        return error_response(f"Database error: {str(e)}", status_code=500)
    except Exception as e:
        logger.error(f"Error updating table: {e}")
        return error_response(str(e), status_code=500)


@router.delete("/projects/{project_id}/versions/{version}/tables/{table_name}")
async def delete_table(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    table_name: str = Path(..., description="Table name"),
    schema_name: str = Query("public", description="Schema name"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete a table from dictionary version."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB ID for the version
        mongo_id = get_version_mongo_id(project_id, version, supabase_client)
        if not mongo_id:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(mongo_id)})
        if not dictionary:
            raise NotFoundError("Dictionary not found in MongoDB")
        
        # Find and remove the table
        schemas_data = dictionary.get("schemas", {})
        table_found = False
        deleted_table = None
        
        # Ensure schemas_data has the correct structure
        if not isinstance(schemas_data, dict) or "tables" not in schemas_data:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        tables = schemas_data.get("tables", [])
        for i, table in enumerate(tables):
            if table.get("name") == table_name and table.get("schema_name") == schema_name:
                deleted_table = tables.pop(i)
                table_found = True
                break
        
        if not table_found:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        # Also remove any relationships involving this table
        relationships = dictionary.get("relationships", [])
        updated_relationships = [
            rel for rel in relationships
            if rel.get("source_table") != table_name and rel.get("target_table") != table_name
        ]
        
        # Update MongoDB
        result = mongodb.dictionaries.update_one(
            {"_id": ObjectId(mongo_id)},
            {
                "$set": {
                    "schemas": schemas_data,
                    "relationships": updated_relationships,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise DatabaseError("Failed to delete table")
        
        return success_response(
            data={
                "deleted_table": deleted_table,
                "relationships_removed": len(relationships) - len(updated_relationships)
            },
            message=f"Table '{table_name}' deleted successfully from schema '{schema_name}'"
        )
    
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error deleting table: {e}")
        return error_response(f"Database error: {str(e)}", status_code=500)
    except Exception as e:
        logger.error(f"Error deleting table: {e}")
        return error_response(str(e), status_code=500)


@router.delete("/projects/{project_id}/versions/{version}/tables/{table_name}/columns/{column_name}")
async def delete_column(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    table_name: str = Path(..., description="Table name"),
    column_name: str = Path(..., description="Column name to delete"),
    schema_name: str = Query("public", description="Schema name"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Delete a column from a table."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB ID for the version
        mongo_id = get_version_mongo_id(project_id, version, supabase_client)
        if not mongo_id:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(mongo_id)})
        if not dictionary:
            raise NotFoundError("Dictionary not found in MongoDB")
        
        # Find the table and remove the column
        schemas_data = dictionary.get("schemas", {})
        table_found = False
        column_found = False
        
        # Ensure schemas_data has the correct structure
        if not isinstance(schemas_data, dict) or "tables" not in schemas_data:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        tables = schemas_data.get("tables", [])
        for table in tables:
            if table.get("name") == table_name and table.get("schema_name") == schema_name:
                table_found = True
                columns = table.get("columns", [])
                
                # Find and remove the column
                for i, col in enumerate(columns):
                    if col.get("name") == column_name:
                        # Don't allow deletion of last column
                        if len(columns) == 1:
                            raise ValidationError("Cannot delete the last column in a table")
                        
                        # Don't allow deletion of primary key if it's the only one
                        if col.get("key") == "PK" or col.get("isPK"):
                            pk_count = sum(1 for c in columns if c.get("key") == "PK" or c.get("isPK"))
                            if pk_count == 1:
                                raise ValidationError("Cannot delete the only primary key column")
                        
                        columns.pop(i)
                        column_found = True
                        break
                
                if column_found:
                    table["columns"] = columns
                    
                    # Also remove any relationships involving this column
                    relationships = dictionary.get("relationships", [])
                    updated_relationships = [
                        rel for rel in relationships
                        if not (
                            (rel.get("source_table") == table_name and rel.get("source_column") == column_name) or
                            (rel.get("target_table") == table_name and rel.get("target_column") == column_name)
                        )
                    ]
                    
                    # Update MongoDB
                    result = mongodb.dictionaries.update_one(
                        {"_id": ObjectId(mongo_id)},
                        {
                            "$set": {
                                "schemas": schemas_data,
                                "relationships": updated_relationships,
                                "updated_at": datetime.utcnow()
                            }
                        }
                    )
                    
                    if result.modified_count == 0:
                        raise DatabaseError("Failed to delete column")
                    
                    return success_response(
                        data={
                            "deleted_column": column_name,
                            "relationships_removed": len(relationships) - len(updated_relationships)
                        },
                        message=f"Column '{column_name}' deleted successfully from table '{table_name}'"
                    )
                break
        
        if not table_found:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        if not column_found:
            raise NotFoundError(f"Column '{column_name}' not found in table '{table_name}'")
    
    except HTTPException:
        raise
    except PyMongoError as e:
        logger.error(f"MongoDB error deleting column: {e}")
        return error_response(f"Database error: {str(e)}", status_code=500)
    except Exception as e:
        logger.error(f"Error deleting column: {e}")
        return error_response(str(e), status_code=500)


@router.get("/projects/{project_id}/versions/{version}/tables/{table_name}")
async def get_table(
    project_id: str = Path(..., description="Project ID"),
    version: int = Path(..., description="Version number"),
    table_name: str = Path(..., description="Table name"),
    schema_name: str = Query("public", description="Schema name"),
    request: Request = None,
    user=Depends(get_current_user)
) -> Dict[str, Any]:
    """Get details of a specific table."""
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Verify project access
        if not verify_project_access(project_id, user_id, supabase_client):
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        # Get MongoDB ID for the version
        mongo_id = get_version_mongo_id(project_id, version, supabase_client)
        if not mongo_id:
            raise NotFoundError(f"Version {version} not found")
        
        # Get dictionary from MongoDB
        mongodb = get_mongodb()
        if mongodb is None:
            raise DatabaseError("MongoDB connection not available")
        
        dictionary = mongodb.dictionaries.find_one({"_id": ObjectId(mongo_id)})
        if not dictionary:
            raise NotFoundError("Dictionary not found in MongoDB")
        
        # Find the table
        target_table = None
        for schema in dictionary.get("schemas", []):
            if schema.get("name") == schema_name:
                for table in schema.get("tables", []):
                    if table.get("name") == table_name:
                        target_table = table
                        break
                break
        
        if not target_table:
            raise NotFoundError(f"Table '{table_name}' not found in schema '{schema_name}'")
        
        # Get relationships for this table
        relationships = []
        for rel in dictionary.get("relationships", []):
            if rel.get("source_table") == table_name or rel.get("target_table") == table_name:
                relationships.append(rel)
        
        return success_response(
            data={
                "table": target_table,
                "relationships": relationships
            },
            message=f"Table '{table_name}' retrieved successfully"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting table: {e}")
        return error_response(str(e), status_code=500)
