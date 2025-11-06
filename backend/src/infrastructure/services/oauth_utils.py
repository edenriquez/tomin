"""OAuth2 utilities for Google authentication."""
import os
from typing import Optional, Dict, Any
from urllib.parse import urlencode

class OAuth2Config:
    """Configuration for OAuth2 providers."""
    
    def __init__(self):
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
        
        # Google OAuth endpoints
        self.google_authorization_endpoint = "https://accounts.google.com/o/oauth2/v2/auth"
        self.google_token_endpoint = "https://oauth2.googleapis.com/token"
        self.google_user_info_endpoint = "https://www.googleapis.com/oauth2/v3/userinfo"
        
    def get_google_authorization_url(self, state: Optional[str] = None) -> str:
        """Generate Google OAuth2 authorization URL."""
        params = {
            "client_id": self.google_client_id,
            "response_type": "code",
            "scope": "openid email profile",
            "redirect_uri": self.redirect_uri,
            "access_type": "offline",
            "prompt": "consent",
        }
        
        if state:
            params["state"] = state
            
        return f"{self.google_authorization_endpoint}?{urlencode(params)}"

class GoogleOAuth2Handler:
    """Handler for Google OAuth2 authentication."""
    
    def __init__(self, config: OAuth2Config):
        self.config = config
    
    async def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user info from Google's userinfo endpoint."""
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.config.google_user_info_endpoint,
                    headers={"Authorization": f"Bearer {access_token}"}
                ) as response:
                    response.raise_for_status()
                    return await response.json()
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None
