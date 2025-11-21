"""Authentication service for handling OAuth flows."""
from typing import Optional, Dict, Any
import aiohttp
from sqlalchemy.ext.asyncio import AsyncSession

from .oauth_utils import OAuth2Config, GoogleOAuth2Handler
from .jwt_service import JWTService
from domain.entities.user import User
from infrastructure.persistence.repositories.user_repository_impl import UserRepositoryImpl


class AuthService:
    """Service for handling authentication operations."""
    
    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.oauth_config = OAuth2Config()
        self.google_oauth_handler = GoogleOAuth2Handler(self.oauth_config)
        self.jwt_service = JWTService()
        self.db_session = db_session
        
    def get_google_auth_url(self, state: Optional[str] = None) -> str:
        """Generate Google OAuth URL."""
        import secrets
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
    
    async def get_or_create_user(self, google_user_info: Dict[str, Any]) -> User:
        """
        Get existing user or create new user from Google OAuth info.
        
        Args:
            google_user_info: User information from Google OAuth
            
        Returns:
            User entity (existing or newly created)
        """
        if not self.db_session:
            raise ValueError("Database session is required for user operations")
        
        user_repo = UserRepositoryImpl(self.db_session)
        
        # Extract Google user data
        google_id = google_user_info.get("sub")
        email = google_user_info.get("email")
        name = google_user_info.get("name", email)
        picture = google_user_info.get("picture")
        
        if not google_id or not email:
            raise ValueError("Invalid Google user info: missing sub or email")
        
        # Check if user already exists
        existing_user = await user_repo.get_by_google_id(google_id)
        
        if existing_user:
            # Update user info if changed
            if existing_user.name != name or existing_user.picture != picture:
                existing_user.update_profile(name=name, picture=picture)
                await user_repo.update(existing_user)
            return existing_user
        
        # Create new user
        new_user = User.create(
            email=email,
            google_id=google_id,
            name=name,
            picture=picture
        )
        
        created_user = await user_repo.create(new_user)
        return created_user
    
    def generate_user_token(self, user: User) -> str:
        """
        Generate JWT token for authenticated user.
        
        Args:
            user: User entity
            
        Returns:
            JWT token string
        """
        return self.jwt_service.create_access_token(
            user_id=user.id,
            email=user.email,
            name=user.name
        )
