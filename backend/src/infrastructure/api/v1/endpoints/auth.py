"""Authentication endpoints for OAuth2 flows."""
from fastapi import APIRouter, HTTPException, status, Cookie, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
import os

from infrastructure.services.auth_service import AuthService
from infrastructure.persistence.database import get_db
from infrastructure.api.dependencies.auth_dependencies import get_current_active_user
from domain.entities.user import User

router = APIRouter()


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
        "sub": current_user.google_id,  # For compatibility with frontend
    }


@router.get("/google")
async def login_google():
    """Initiate Google OAuth flow."""
    try:
        auth_service = AuthService()
        auth_url = auth_service.get_google_auth_url()
        print(f"Redirecting to Google OAuth URL: {auth_url}")
        return RedirectResponse(url=auth_url)
    except Exception as e:
        print(f"Error in login_google: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google OAuth: {str(e)}"
        )


@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback and create/login user."""
    try:
        auth_service = AuthService(db_session=db)
        
        # Exchange code for tokens
        tokens = await auth_service.get_google_tokens(code)
        if not tokens or "access_token" not in tokens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Google"
            )
        
        # Get user info from Google
        google_user_info = await auth_service.get_google_user_info(tokens["access_token"])
        if not google_user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        # Create or get user in database
        user = await auth_service.get_or_create_user(google_user_info)
        
        # Generate JWT token for the user
        jwt_token = auth_service.generate_user_token(user)
        
        # Redirect to frontend with JWT token in cookie
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        response = RedirectResponse(url=f"{frontend_url}/dashboard")
        
        # Set JWT token in HTTP-only cookie
        is_production = os.getenv("ENVIRONMENT", "development") == "production"
        
        # For cross-domain cookies in production, we need SameSite=None and Secure=True
        # For local development, use Lax
        response.set_cookie(
            key="access_token",
            value=jwt_token,
            httponly=True,
            secure=True if is_production else False,  # Must be True for SameSite=None
            max_age=86400,  # 24 hours
            samesite="none" if is_production else "lax",  # None allows cross-domain
            domain=None  # Let browser determine domain
        )
        
        print(f"User authenticated: {user.email} (ID: {user.id})")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in google_callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.get("/logout")
async def logout():
    """Log out the current user."""
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("access_token")
    return response
