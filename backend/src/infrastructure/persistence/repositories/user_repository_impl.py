"""Concrete implementation of UserRepository using SQLAlchemy."""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from domain.entities.user import User
from domain.repositories.user_repository import UserRepository
from infrastructure.persistence.models.user_model import UserModel


class UserRepositoryImpl(UserRepository):
    """SQLAlchemy implementation of UserRepository."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    def _to_entity(self, model: UserModel) -> User:
        """Convert database model to domain entity."""
        return User(
            id=model.id,
            email=model.email,
            google_id=model.google_id,
            name=model.name,
            picture=model.picture,
            created_at=model.created_at,
            updated_at=model.updated_at,
            is_active=model.is_active
        )
    
    def _to_model(self, entity: User) -> UserModel:
        """Convert domain entity to database model."""
        return UserModel(
            id=entity.id,
            email=entity.email,
            google_id=entity.google_id,
            name=entity.name,
            picture=entity.picture,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
            is_active=entity.is_active
        )
    
    async def create(self, user: User) -> User:
        """Create a new user in the database."""
        model = self._to_model(user)
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)
    
    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Get a user by their ID."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get a user by their email address."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None
    
    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Get a user by their Google ID."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.google_id == google_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None
    
    async def update(self, user: User) -> User:
        """Update an existing user."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.id == user.id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError(f"User with id {user.id} not found")
        
        model.email = user.email
        model.google_id = user.google_id
        model.name = user.name
        model.picture = user.picture
        model.updated_at = user.updated_at
        model.is_active = user.is_active
        
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)
    
    async def delete(self, user_id: str) -> bool:
        """Delete a user by their ID."""
        result = await self.session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        model = result.scalar_one_or_none()
        
        if not model:
            return False
        
        await self.session.delete(model)
        await self.session.flush()
        return True
    
    async def exists_by_email(self, email: str) -> bool:
        """Check if a user exists with the given email."""
        result = await self.session.execute(
            select(UserModel.id).where(UserModel.email == email)
        )
        return result.scalar_one_or_none() is not None
    
    async def exists_by_google_id(self, google_id: str) -> bool:
        """Check if a user exists with the given Google ID."""
        result = await self.session.execute(
            select(UserModel.id).where(UserModel.google_id == google_id)
        )
        return result.scalar_one_or_none() is not None
