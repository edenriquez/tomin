"""JWT token generation and validation service."""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from config.jwt_config import jwt_config


class JWTService:
    """Service for handling JWT token operations."""
    
    def __init__(self):
        self.config = jwt_config
    
    def create_access_token(
        self,
        user_id: str,
        email: str,
        name: str,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a JWT access token for a user.
        
        Args:
            user_id: User's unique identifier
            email: User's email address
            name: User's display name
            additional_claims: Optional additional claims to include in token
            
        Returns:
            Encoded JWT token string
        """
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.config.access_token_expire_seconds)
        
        payload = {
            "sub": user_id,  # Subject (user ID)
            "email": email,
            "name": name,
            "iat": now,  # Issued at
            "exp": expires_at,  # Expiration time
        }
        
        # Add any additional claims
        if additional_claims:
            payload.update(additional_claims)
        
        token = jwt.encode(
            payload,
            self.config.secret_key,
            algorithm=self.config.algorithm
        )
        
        return token
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT token.
        
        Args:
            token: JWT token string to verify
            
        Returns:
            Decoded token payload if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                self.config.secret_key,
                algorithms=[self.config.algorithm]
            )
            return payload
        except ExpiredSignatureError:
            print("Token has expired")
            return None
        except InvalidTokenError as e:
            print(f"Invalid token: {e}")
            return None
    
    def get_user_id_from_token(self, token: str) -> Optional[str]:
        """
        Extract user ID from a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            User ID if token is valid, None otherwise
        """
        payload = self.verify_token(token)
        if payload:
            return payload.get("sub")
        return None
    
    def get_user_email_from_token(self, token: str) -> Optional[str]:
        """
        Extract user email from a JWT token.
        
        Args:
            token: JWT token string
            
        Returns:
            User email if token is valid, None otherwise
        """
        payload = self.verify_token(token)
        if payload:
            return payload.get("email")
        return None
    
    def refresh_token(self, token: str) -> Optional[str]:
        """
        Refresh an existing token if it's still valid.
        
        Args:
            token: Existing JWT token
            
        Returns:
            New JWT token if original is valid, None otherwise
        """
        payload = self.verify_token(token)
        if not payload:
            return None
        
        # Create new token with same claims but new expiration
        return self.create_access_token(
            user_id=payload.get("sub"),
            email=payload.get("email"),
            name=payload.get("name")
        )
