"""Authentication endpoints for OAuth2 flows."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from typing import Any, Dict, Optional

from ....infrastructure.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.get("/google")
async def login_google():
    """Initiate Google OAuth flow."""
    auth_service = AuthService()
    auth_url = auth_service.get_google_auth_url()
    return {"auth_url": auth_url}

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
        
        # Create JWT token
        jwt_token = auth_service.create_jwt_token({
            "sub": user_info.get("sub"),
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture")
        })
        
        # In a real app, you might want to set this as an HTTP-only cookie
        response = RedirectResponse(url="/")
        response.set_cookie(
            key="access_token",
            value=f"Bearer {jwt_token}",
            httponly=True,
            max_age=3600,
            samesite="lax"
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
