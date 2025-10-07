"""
FuckDB Backend API
Main FastAPI application entry point.
"""

from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.logger import get_logger
from api.v1 import api_router

logger = get_logger(__name__)


# =============================
# Lifespan Context Manager
# =============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting FuckDB Backend API")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Debug Mode: {settings.DEBUG}")
    yield
    # Shutdown
    logger.info("Shutting down FuckDB Backend API")


# =============================
# FastAPI App Initialization
# =============================
app = FastAPI(
    title="FuckDB API",
    description="Backend API for FuckDB - Full-Stack DB Schema Visualizer",
    version="2.0.0",  # Updated version after refactoring
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,  # Disable docs in production
    redoc_url="/redoc" if settings.DEBUG else None,
)


# =============================
# CORS Middleware
# =============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)


# =============================
# Include API Routers
# =============================
app.include_router(api_router)

# =============================
# Root Endpoint
# =============================
@app.get("/", tags=["Root"])
def home():
    """Root endpoint with API information."""
    return {
        "message": "FuckDB API is running",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs" if settings.DEBUG else "Disabled in production",
        "api_base": "/api/v1"
    }


# =============================
# Health Check Endpoint
# =============================
@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "fuckdb-backend"
    }
