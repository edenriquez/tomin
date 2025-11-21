"""Abstract repository interface for User entity."""
from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.user import User


class UserRepository(ABC):
    """Abstract repository for User persistence operations."""
    
    @abstractmethod
    async def create(self, user: User) -> User:
        """Create a new user in the database."""
        pass
    
    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by their ID."""
        pass
    
    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by their email address."""
        pass
    
    @abstractmethod
    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Get a user by their Google ID."""
        pass
    
    @abstractmethod
    async def update(self, user: User) -> User:
        """Update an existing user."""
        pass
    
    @abstractmethod
    async def delete(self, user_id: str) -> bool:
        """Delete a user by their ID."""
        pass
    
    @abstractmethod
    async def exists_by_email(self, email: str) -> bool:
        """Check if a user exists with the given email."""
        pass
    
    @abstractmethod
    async def exists_by_google_id(self, google_id: str) -> bool:
        """Check if a user exists with the given Google ID."""
        pass
