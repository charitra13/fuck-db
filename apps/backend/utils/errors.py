"""
Custom exceptions and error handlers for FuckDB Backend.
"""

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from core.config import settings
from core.logger import get_logger

logger = get_logger(__name__)


class FuckDBException(Exception):
    """Base exception for FuckDB application."""
    def __init__(self, message: str, status_code: int = 500, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(FuckDBException):
    """Resource not found exception."""
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} '{identifier}' not found"
        super().__init__(message, status_code=404)


class ValidationError(FuckDBException):
    """Validation error exception."""
    def __init__(self, message: str, field: str = None):
        details = {}
        if field:
            details["field"] = field
        super().__init__(message, status_code=400, details=details)


class AuthenticationError(FuckDBException):
    """Authentication error exception."""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, status_code=401)


class AuthorizationError(FuckDBException):
    """Authorization error exception."""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=403)


class DatabaseError(FuckDBException):
    """Database operation error."""
    def __init__(self, message: str = "Database operation failed", operation: str = None):
        details = {}
        if operation:
            details["operation"] = operation
        super().__init__(message, status_code=500, details=details)


class ConflictError(FuckDBException):
    """Conflict error exception for duplicate resources."""
    def __init__(self, message: str = "Resource already exists", resource: str = None):
        details = {}
        if resource:
            details["resource"] = resource
        super().__init__(message, status_code=409, details=details)


async def fuckdb_exception_handler(request: Request, exc: FuckDBException):
    """Handle FuckDB custom exceptions."""
    logger.error(f"FuckDBException: {exc.message}", extra={"details": exc.details})
    
    content = {
        "status": "error",
        "message": exc.message,
        "code": exc.status_code
    }
    
    if settings.DEBUG and exc.details:
        content["details"] = exc.details
    
    return JSONResponse(
        status_code=exc.status_code,
        content=content
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle generic exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    if settings.DEBUG:
        content = {
            "status": "error",
            "message": str(exc),
            "code": 500,
            "type": type(exc).__name__
        }
    else:
        content = {
            "status": "error",
            "message": "Internal server error",
            "code": 500
        }
    
    return JSONResponse(
        status_code=500,
        content=content
    )