"""
Security module for FuckDB Backend.
Handles JWT validation, authentication, and authorization.
"""

import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from .config import settings
from .db import get_authenticated_supabase
import logging

logger = logging.getLogger(__name__)

# Security scheme for API documentation
security = HTTPBearer(auto_error=False)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded JWT payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # JWT validation with Supabase configuration
        issuer_url = f"{settings.SUPABASE_URL}/auth/v1"
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",  # Supabase default audience
            issuer=issuer_url
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        detail = "Session expired" if settings.DEBUG else "Authentication required"
        raise HTTPException(status_code=401, detail=detail)
        
    except jwt.InvalidAudienceError:
        detail = "Invalid token audience" if settings.DEBUG else "Authentication failed"
        raise HTTPException(status_code=401, detail=detail)
        
    except jwt.InvalidIssuerError:
        detail = "Invalid token issuer" if settings.DEBUG else "Authentication failed"
        raise HTTPException(status_code=401, detail=detail)
        
    except Exception as e:
        if settings.DEBUG:
            logger.error(f"JWT decode error: {e}")
            detail = f"JWT validation failed: {str(e)}"
        else:
            detail = "Invalid or expired session"
        raise HTTPException(status_code=401, detail=detail)


def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Get current authenticated user from request.
    Checks JWT token from cookie or Authorization header.
    
    Args:
        request: FastAPI request object
        
    Returns:
        User payload from JWT token
        
    Raises:
        HTTPException: If user is not authenticated
    """
    # First try to get token from cookie (web app)
    token = request.cookies.get("session")
    
    # If not in cookie, try Authorization header (API clients)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return decode_jwt_token(token)


def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """
    Get current authenticated user from request if available.
    Returns None if user is not authenticated (doesn't raise exception).
    
    Args:
        request: FastAPI request object
        
    Returns:
        User payload from JWT token or None
    """
    try:
        return get_current_user(request)
    except HTTPException:
        return None


def get_user_id(user: Dict[str, Any]) -> str:
    """
    Extract user ID from user payload.
    
    Args:
        user: User payload from JWT token
        
    Returns:
        User ID
        
    Raises:
        HTTPException: If user ID is not found
    """
    user_id = user.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user token")
    return user_id


def set_auth_cookie(response: Response, access_token: str) -> None:
    """
    Set authentication cookie with JWT token.
    
    Args:
        response: FastAPI response object
        access_token: JWT access token
    """
    response.set_cookie(
        key="session",
        value=access_token,
        httponly=True,
        secure=settings.IS_PRODUCTION,  # HTTPS in production only
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,  # 7 days
    )


def clear_auth_cookie(response: Response) -> None:
    """
    Clear authentication cookie.
    
    Args:
        response: FastAPI response object
    """
    response.delete_cookie("session")


def verify_user_owns_resource(user_id: str, resource_owner_id: str, resource_type: str = "resource") -> None:
    """
    Verify that the user owns a specific resource.
    
    Args:
        user_id: ID of the current user
        resource_owner_id: Owner ID of the resource
        resource_type: Type of resource (for error message)
        
    Raises:
        HTTPException: If user doesn't own the resource
    """
    if user_id != resource_owner_id:
        raise HTTPException(
            status_code=403,
            detail=f"You don't have permission to access this {resource_type}"
        )


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    Note: This is typically handled by Supabase, included here for completeness.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    try:
        import bcrypt
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    except ImportError:
        logger.warning("bcrypt not installed. Password hashing not available.")
        return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    Note: This is typically handled by Supabase, included here for completeness.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password
        
    Returns:
        True if password matches
    """
    try:
        import bcrypt
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ImportError:
        logger.warning("bcrypt not installed. Password verification not available.")
        return plain_password == hashed_password


def get_user_supabase(request: Request) -> Client:
    """
    Get authenticated Supabase client for the current user from request.
    Extracts JWT token from cookies or Authorization header.
    
    Args:
        request: FastAPI Request object
        
    Returns:
        Authenticated Supabase client
        
    Raises:
        HTTPException: If no valid authentication token found
    """
    # Try to get token from cookie first
    jwt_token = request.cookies.get("session")
    
    # Fall back to Authorization header
    if not jwt_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            jwt_token = auth_header.split(" ")[1]
    
    if not jwt_token:
        raise HTTPException(
            status_code=401,
            detail="No authentication token found"
        )
    
    return get_authenticated_supabase(jwt_token)