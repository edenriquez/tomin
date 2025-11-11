"""Authentication service for handling OAuth flows."""
from typing import Optional, Dict, Any
import aiohttp
import base64
import json
import secrets

from .oauth_utils import OAuth2Config, GoogleOAuth2Handler

class AuthService:
    """Service for handling authentication operations."""
    
    def __init__(self):
        self.oauth_config = OAuth2Config()
        self.google_oauth_handler = GoogleOAuth2Handler(self.oauth_config)
        
    def get_google_auth_url(self, state: Optional[str] = None) -> str:
        """Generate Google OAuth URL."""
        if not state:
            state = secrets.token_urlsafe(16)
        return self.oauth_config.get_google_authorization_url(state)
    
    async def get_google_tokens(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access and ID tokens."""
        data = {
            'code': code,
            'client_id': self.oauth_config.google_client_id,
            'client_secret': self.oauth_config.google_client_secret,
            'redirect_uri': self.oauth_config.redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.oauth_config.google_token_endpoint,
                data=data
            ) as response:
                response.raise_for_status()
                return await response.json()
    
    async def get_google_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """Get user info using access token."""
        return await self.google_oauth_handler.get_user_info(access_token)
    
    def create_jwt_token(self, user_data: Dict[str, Any]) -> str:
        """Create a JWT token for the authenticated user."""
        # This is a simplified version. In production, use a proper JWT library
        # like python-jose or PyJWT
        header = {
            "alg": "HS256",
            "typ": "JWT"
        }
        
        # Encode header and payload
        encoded_header = base64.urlsafe_b64encode(
            json.dumps(header).encode()
        ).decode().rstrip("=")
        
        encoded_payload = base64.urlsafe_b64encode(
            json.dumps(user_data).encode()
        ).decode().rstrip("=")
        
        # In a real app, you would sign the token with a secret key
        signature = "signed_token_placeholder"
        
        return f"{encoded_header}.{encoded_payload}.{signature}"
