"""
Projects API endpoints for FuckDB Backend.
Handles CRUD operations for projects.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from bson import ObjectId
from pymongo.errors import PyMongoError
from core.config import settings
from core.db import get_mongodb
from core.security import get_current_user, get_user_id, get_user_supabase
from core.logger import get_logger
from models.dictionary import Schema, Table, Column, TableType, ColumnKey

logger = get_logger(__name__)

router = APIRouter()


# =============================
# Helper Functions
# =============================
def create_initial_dictionary(project_id: str, user_id: str, supabase_client) -> Optional[str]:
    """
    Create an initial dictionary version for a new project.
    Returns the mongo_id of the created dictionary.
    
    Args:
        project_id: Project UUID
        user_id: User UUID
        supabase_client: Authenticated Supabase client for RLS operations
    """
    try:
        # Get MongoDB instance
        mongodb = get_mongodb()
        if mongodb is None:
            logger.error("MongoDB connection not available for dictionary creation")
            return None
        
        # Create default schema structure
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
        
        default_schema = Schema(
            name="public",
            description="Default public schema",
            tables=[sample_table]
        )
        
        # Create dictionary document
        dictionary_doc = {
            "projectId": project_id,
            "version": 1,
            "name": "Initial Version",
            "description": "Automatically created initial version",
            "schemas": {
                "tables": [table.model_dump(by_alias=True, exclude_none=True) for table in default_schema.tables],
                "relationships": []
            },
            "relationships": [],
            "erd": {
                "nodes": [],
                "edges": []
            },
            "metadata": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert into MongoDB
        mongo_result = mongodb.dictionaries.insert_one(dictionary_doc)
        mongo_id = str(mongo_result.inserted_id)
        
        # Create version metadata in Supabase
        version_metadata = {
            "id": str(uuid4()),
            "project_id": project_id,
            "version": 1,
            "mongo_id": mongo_id,
            "name": "Initial Version",
            "description": "Automatically created initial version",
            "is_latest": True,
            "metadata": {},
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase_client.table("dictionary_versions").insert(version_metadata).execute()
        
        logger.info(f"Initial dictionary created for project {project_id}")
        return mongo_id
        
    except PyMongoError as e:
        logger.error(f"MongoDB error creating initial dictionary: {e}")
        return None
    except Exception as e:
        logger.error(f"Error creating initial dictionary: {e}")
        return None


# =============================
# Request/Response Models
# =============================
class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(None, max_length=500, description="Project description")


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Project name")
    description: Optional[str] = Field(None, max_length=500, description="Project description")


class ProjectResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


class ProjectListResponse(BaseModel):
    status: str
    projects: List[ProjectResponse]
    total: int


class ProjectDetailResponse(BaseModel):
    status: str
    project: ProjectResponse


# =============================
# Helper Functions
# =============================
def handle_project_error(error: Exception, context: str = "Project operation failed") -> str:
    """Handle project errors with appropriate detail level."""
    if settings.DEBUG:
        error_detail = f"{context}: {str(error)}"
        logger.error(error_detail)
    else:
        error_detail = context
    return error_detail


# =============================
# Project Endpoints
# =============================
@router.get("", response_model=ProjectListResponse)
@router.get("/", response_model=ProjectListResponse)
def list_projects(
    request: Request,
    user=Depends(get_current_user),
    limit: int = 100,
    offset: int = 0
):
    """
    List all projects for the authenticated user.
    Supports pagination with limit and offset.
    """
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Fetch projects from Supabase
        query = supabase_client.table("projects").select("*").eq("owner_id", user_id)
        
        # Apply pagination
        if offset > 0:
            query = query.range(offset, offset + limit - 1)
        else:
            query = query.limit(limit)
        
        # Order by creation date (newest first)
        query = query.order("created_at", desc=True)
        
        response = query.execute()
        
        projects = []
        if response.data:
            projects = [
                ProjectResponse(
                    id=project["id"],
                    owner_id=project["owner_id"],
                    name=project["name"],
                    description=project.get("description"),
                    created_at=project["created_at"],
                    updated_at=project.get("updated_at")
                )
                for project in response.data
            ]
        
        logger.info(f"Listed {len(projects)} projects for user {user_id}")
        
        return ProjectListResponse(
            status="success",
            projects=projects,
            total=len(projects)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_project_error(e, "Failed to list projects")
        raise HTTPException(status_code=500, detail=error_detail)


@router.post("", response_model=ProjectDetailResponse)
@router.post("/", response_model=ProjectDetailResponse)
def create_project(
    project_data: CreateProjectRequest,
    request: Request,
    user=Depends(get_current_user)
):
    """
    Create a new project for the authenticated user.
    """
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Prepare project data
        new_project = {
            "owner_id": user_id,
            "name": project_data.name.strip(),
            "description": project_data.description.strip() if project_data.description else None
        }
        
        # Insert into Supabase
        response = supabase_client.table("projects").insert(new_project).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        created_project = response.data[0]
        
        logger.info(f"Project created: {created_project['id']} by user {user_id}")
        
        # Create initial dictionary for the project
        mongo_id = create_initial_dictionary(created_project["id"], user_id, supabase_client)
        if mongo_id:
            logger.info(f"Initial dictionary created for project {created_project['id']}")
        else:
            logger.warning(f"Failed to create initial dictionary for project {created_project['id']}, but project was created successfully")
        
        return ProjectDetailResponse(
            status="success",
            project=ProjectResponse(
                id=created_project["id"],
                owner_id=created_project["owner_id"],
                name=created_project["name"],
                description=created_project.get("description"),
                created_at=created_project["created_at"],
                updated_at=created_project.get("updated_at")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_project_error(e, "Failed to create project")
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(
    project_id: str,
    request: Request,
    user=Depends(get_current_user)
):
    """
    Get details for a specific project.
    User must own the project to access it.
    """
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Fetch project with ownership check
        response = supabase_client.table("projects").select("*").eq("id", project_id).eq("owner_id", user_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Project not found")
        
        project = response.data
        
        return ProjectDetailResponse(
            status="success",
            project=ProjectResponse(
                id=project["id"],
                owner_id=project["owner_id"],
                name=project["name"],
                description=project.get("description"),
                created_at=project["created_at"],
                updated_at=project.get("updated_at")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_project_error(e, f"Failed to get project")
        raise HTTPException(status_code=500, detail=error_detail)


@router.put("/{project_id}", response_model=ProjectDetailResponse)
def update_project(
    project_id: str,
    project_data: UpdateProjectRequest,
    request: Request,
    user=Depends(get_current_user)
):
    """
    Update an existing project.
    User must own the project to update it.
    """
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        
        # Check project ownership
        existing = supabase_client.table("projects").select("id").eq("id", project_id).eq("owner_id", user_id).single().execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Prepare update data
        update_data = {}
        if project_data.name is not None:
            update_data["name"] = project_data.name.strip()
        if project_data.description is not None:
            update_data["description"] = project_data.description.strip() if project_data.description else None
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Update project
        response = supabase_client.table("projects").update(update_data).eq("id", project_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update project")
        
        updated_project = response.data[0]
        
        logger.info(f"Project updated: {project_id} by user {user_id}")
        
        return ProjectDetailResponse(
            status="success",
            project=ProjectResponse(
                id=updated_project["id"],
                owner_id=updated_project["owner_id"],
                name=updated_project["name"],
                description=updated_project.get("description"),
                created_at=updated_project["created_at"],
                updated_at=updated_project.get("updated_at")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_project_error(e, "Failed to update project")
        raise HTTPException(status_code=500, detail=error_detail)


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    request: Request,
    user=Depends(get_current_user)
):
    """
    Delete a project and all associated data, including dictionaries from MongoDB.
    User must own the project to delete it.
    """
    try:
        user_id = get_user_id(user)
        supabase_client = get_user_supabase(request)
        mongodb = get_mongodb()

        # Check project ownership
        existing = supabase_client.table("projects").select("id").eq("id", project_id).eq("owner_id", user_id).single().execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get all dictionary versions for the project
        versions_response = supabase_client.table("dictionary_versions").select("mongo_id").eq("project_id", project_id).execute()
        
        if versions_response.data:
            mongo_ids_to_delete = [ObjectId(version["mongo_id"]) for version in versions_response.data if "mongo_id" in version]
            
            if mongo_ids_to_delete:
                # Delete all found dictionaries from MongoDB
                try:
                    mongodb.dictionaries.delete_many({"_id": {"$in": mongo_ids_to_delete}})
                    logger.info(f"Deleted {len(mongo_ids_to_delete)} dictionaries from MongoDB for project {project_id}")
                except PyMongoError as e:
                    logger.error(f"MongoDB error deleting dictionaries for project {project_id}: {e}")
                    # Decide if you want to raise an exception or just log the error
                    # For now, we log and continue to ensure Supabase data is cleaned up
        
        # Supabase is configured with cascading deletes. 
        # Deleting a project will automatically delete related dictionary_versions.
        delete_response = supabase_client.table("projects").delete().eq("id", project_id).execute()

        if not delete_response.data:
             raise HTTPException(status_code=500, detail="Failed to delete project from Supabase")

        logger.info(f"Project {project_id} and all associated data deleted successfully by user {user_id}")

        return {
            "status": "success",
            "message": "Project and all associated data deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_project_error(e, "Failed to delete project")
        raise HTTPException(status_code=500, detail=error_detail)