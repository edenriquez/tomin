"""User domain entity."""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import uuid


@dataclass
class User:
    """User entity representing an authenticated user."""
    
    id: str
    email: str
    google_id: str
    name: str
    picture: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    
    @classmethod
    def create(
        cls,
        email: str,
        google_id: str,
        name: str,
        picture: Optional[str] = None
    ) -> "User":
        """Create a new user instance."""
        now = datetime.utcnow()
        return cls(
            id=str(uuid.uuid4()),
            email=email,
            google_id=google_id,
            name=name,
            picture=picture,
            created_at=now,
            updated_at=now,
            is_active=True
        )
    
    def update_profile(self, name: Optional[str] = None, picture: Optional[str] = None) -> None:
        """Update user profile information."""
        if name:
            self.name = name
        if picture:
            self.picture = picture
        self.updated_at = datetime.utcnow()
    
    def deactivate(self) -> None:
        """Deactivate the user account."""
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def activate(self) -> None:
        """Activate the user account."""
        self.is_active = True
        self.updated_at = datetime.utcnow()
