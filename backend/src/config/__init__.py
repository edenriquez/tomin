"""
Configuration management for backend using pydantic-settings.
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl

class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "backend"
    DEBUG: bool = True
    
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_DESCRIPTION: str = "A FastAPI application with clean architecture"
    VERSION: str = "1.0.0"
    
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:8000"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    # Database (example - customize as needed)
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    
    # Security (example - customize as needed)
    SECRET_KEY: str = "your-secret-key-here"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    # Model configuration
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

# Create settings instance
settings = Settings()
