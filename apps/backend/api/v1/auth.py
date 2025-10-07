"""
Authentication API endpoints for FuckDB Backend.
Handles user signup, login, logout, and profile management.
"""

from fastapi import APIRouter, HTTPException, Response, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Dict, Any, Optional
from core.config import settings
from core.db import supabase, get_authenticated_supabase  # supabase used only for auth.sign_up/sign_in
from core.security import (
    get_current_user, 
    set_auth_cookie, 
    clear_auth_cookie,
    get_user_id
)
from core.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()


# =============================
# Request/Response Models
# =============================
class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class LoginResponse(BaseModel):
    status: str
    email: str
    message: Optional[str] = None


class SignupResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None


class UserProfileResponse(BaseModel):
    status: str
    user: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None


# =============================
# Helper Functions
# =============================
def handle_auth_error(error: Exception, context: str = "Authentication error") -> str:
    """Handle authentication errors with environment-appropriate detail level."""
    if settings.DEBUG:
        error_detail = f"{context}: {str(error)}"
        logger.error(error_detail)
    else:
        error_detail = context
    return error_detail


# =============================
# Authentication Endpoints
# =============================
@router.post("/signup", response_model=SignupResponse)
def signup(user: UserSignup):
    """
    Register a new user account.
    Creates user in Supabase Auth and optionally in users table.
    """
    try:
        # Prepare signup data
        signup_data = {
            "email": user.email,
            "password": user.password
        }
        
        # Add user metadata if provided
        if user.full_name:
            signup_data["options"] = {
                "data": {"full_name": user.full_name}
            }
        
        result = supabase.auth.sign_up(signup_data)
        
        if not result.user:
            raise HTTPException(
                status_code=400,
                detail="Failed to create user account"
            )
        
        logger.info(f"New user signup: {user.email}")
        
        return SignupResponse(
            status="success",
            message="Account created successfully. Please check your email to verify your account.",
            data={"user_id": result.user.id}
        )
        
    except Exception as e:
        error_detail = handle_auth_error(e, "User signup failed")
        raise HTTPException(status_code=400, detail=error_detail)


@router.post("/login", response_model=LoginResponse)
def login(user: UserLogin, response: Response):
    """
    Authenticate user and create session.
    Sets JWT token in secure HTTP-only cookie.
    """
    try:
        result = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        if not result.user or not result.session:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Set authentication cookie
        set_auth_cookie(response, result.session.access_token)
        
        logger.info(f"User login successful: {user.email}")
        
        return LoginResponse(
            status="success",
            email=user.email,
            message="Login successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_auth_error(e, "Login failed")
        raise HTTPException(status_code=401, detail=error_detail)


@router.post("/logout")
def logout(response: Response):
    """
    Logout current user and clear session.
    Removes authentication cookie.
    """
    clear_auth_cookie(response)
    logger.info("User logged out")
    
    return {
        "status": "success",
        "message": "Logged out successfully"
    }


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(request: Request, user=Depends(get_current_user)):
    """
    Get current authenticated user's profile.
    Returns user information from JWT token.
    """
    try:
        user_profile = {
            "id": user.get("sub"),
            "email": user.get("email"),
            "role": user.get("role", "authenticated"),
            "created_at": user.get("created_at"),
            "user_metadata": user.get("user_metadata", {})
        }
        
        return UserProfileResponse(
            status="success",
            user=user_profile
        )
        
    except Exception as e:
        error_detail = handle_auth_error(e, "Failed to get user profile")
        raise HTTPException(status_code=500, detail=error_detail)


@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile_details(request: Request, user=Depends(get_current_user)):
    """
    Get detailed user profile from database.
    Uses RLS to ensure user can only access their own profile.
    """
    try:
        user_id = get_user_id(user)
        
        # Get JWT token for authenticated Supabase client
        jwt_token = request.cookies.get("session")
        if not jwt_token:
            # Try Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                jwt_token = auth_header.split(" ")[1]
        
        if not jwt_token:
            raise HTTPException(status_code=401, detail="No authentication token found")
        
        # Create authenticated client for RLS
        supabase_auth = get_authenticated_supabase(jwt_token)
        
        # Query user profile with RLS
        response = supabase_auth.table("users").select(
            "id, email, full_name, created_at"
        ).eq("id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            logger.warning(f"User profile not found for ID: {user_id}")
            raise HTTPException(status_code=404, detail="User profile not found")
        
        user_data = response.data[0]
        
        profile = {
            "id": user_data["id"],
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "created_at": user_data["created_at"],
            "role": user.get("role", "authenticated")
        }
        
        return UserProfileResponse(
            status="success",
            profile=profile
        )
        
    except HTTPException:
        raise
    except Exception as e:
        error_detail = handle_auth_error(e, "Failed to get user profile")
        raise HTTPException(status_code=500, detail=error_detail)