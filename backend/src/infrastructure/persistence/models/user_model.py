"""SQLAlchemy User model for database persistence."""
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
from infrastructure.persistence.database import Base


class UserModel(Base):
    """SQLAlchemy model for users table."""
    
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    google_id = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    picture = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    def __repr__(self):
        return f"<UserModel(id={self.id}, email={self.email}, name={self.name})>"
