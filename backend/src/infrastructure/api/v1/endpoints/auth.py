"""Authentication endpoints for OAuth2 flows."""
from fastapi import APIRouter, HTTPException, status, Cookie
from fastapi.responses import RedirectResponse
from typing import Optional

from infrastructure.services.auth_service import AuthService

router = APIRouter()

@router.get("/me")
async def get_me(access_token: Optional[str] = Cookie(None)):
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No access token provided"
        )
    try:
        auth_service = AuthService()
        return await auth_service.get_google_user_info(access_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/google")
async def login_google():
    """Initiate Google OAuth flow."""
    try:
        auth_service = AuthService()
        auth_url = auth_service.get_google_auth_url()
        print(f"Redirecting to Google OAuth URL: {auth_url}")  # Debug log
        return RedirectResponse(url=auth_url)
    except Exception as e:
        print(f"Error in login_google: {str(e)}")  # Debug log
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google OAuth: {str(e)}"
        )

@router.get("/google/callback")
async def google_callback(code: str):
    """Handle Google OAuth callback."""
    try:
        auth_service = AuthService()
        
        # Exchange code for tokens
        tokens = await auth_service.get_google_tokens(code)
        if not tokens or "access_token" not in tokens:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token from Google"
            )
        
        # Get user info
        user_info = await auth_service.get_google_user_info(tokens["access_token"])
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        # Create or get user in your system
        # user = await user_service.get_or_create_user(user_info)
        
        # Set the Google access token in an HTTP-only cookie
        frontend_url = "http://localhost:3000"  # Your frontend URL
        response = RedirectResponse(url=f"{frontend_url}/dashboard")
        response.set_cookie(
            key="access_token",
            value=tokens["access_token"],  # Store Google access token, not JWT
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            max_age=3600,
            samesite="lax",
            domain="localhost"  # Remove or adjust for production
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/logout")
async def logout():
    """Log out the current user."""
    response = RedirectResponse(url="/")
    response.delete_cookie("access_token")
    return response
