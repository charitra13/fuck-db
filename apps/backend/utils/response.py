"""
Response utilities for standardized API responses.
"""

from typing import Any, Dict, Optional, List
from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standardized API response model."""
    status: str = "success"
    message: Optional[str] = None
    data: Optional[Any] = None
    errors: Optional[List[str]] = None
    

def success_response(data: Any = None, message: str = None) -> Dict[str, Any]:
    """Create a success response."""
    response = {"status": "success"}
    if message:
        response["message"] = message
    if data is not None:
        response["data"] = data
    return response


def error_response(message: str, errors: List[str] = None, status_code: int = 400) -> Dict[str, Any]:
    """Create an error response."""
    response = {
        "status": "error",
        "message": message,
        "code": status_code
    }
    if errors:
        response["errors"] = errors
    return response


def pagination_response(
    items: List[Any],
    total: int,
    page: int = 1,
    per_page: int = 20,
    message: str = None
) -> Dict[str, Any]:
    """Create a paginated response."""
    response = {
        "status": "success",
        "data": items,
        "pagination": {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if per_page > 0 else 0
        }
    }
    if message:
        response["message"] = message
    return response