"""JWT configuration settings."""
import os
from typing import Optional


class JWTConfig:
    """Configuration for JWT token generation and validation."""
    
    def __init__(self):
        self.secret_key: str = os.getenv("JWT_SECRET_KEY", "")
        self.algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes: int = int(
            os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")  # 24 hours default
        )
        
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY environment variable must be set")
    
    @property
    def access_token_expire_seconds(self) -> int:
        """Get access token expiration in seconds."""
        return self.access_token_expire_minutes * 60


# Global JWT configuration instance
jwt_config = JWTConfig()
