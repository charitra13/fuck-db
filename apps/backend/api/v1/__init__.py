"""
API v1 router collection for FuckDB Backend.
This module aggregates all v1 API routers.
"""

from fastapi import APIRouter
from .auth import router as auth_router
from .projects import router as projects_router
from .versions import router as versions_router
from .tables import router as tables_router
from .columns import router as columns_router
from .erd import router as erd_router
from .import_export import router as import_export_router

# Create main v1 router
api_router = APIRouter(prefix="/api/v1")

# Include all sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
api_router.include_router(versions_router, tags=["Dictionary Versions"])  # Removed prefix to fix routing
api_router.include_router(tables_router, prefix="/tables", tags=["Tables"])
api_router.include_router(columns_router, prefix="/columns", tags=["Columns"])
api_router.include_router(erd_router, prefix="/erd", tags=["ERD"])
api_router.include_router(import_export_router, tags=["Import/Export"])

__all__ = ["api_router"]