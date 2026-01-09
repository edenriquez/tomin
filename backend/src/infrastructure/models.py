from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from .database import Base

class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    color = Column(String)
    icon = Column(String)
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)

class TransactionModel(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    file_id = Column(String, ForeignKey("processed_files.id"), nullable=True)
    merchant_name = Column(String, nullable=True)
    is_recurrent = Column(Boolean, default=False)
    metadata_json = Column(JSON, default={})
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)



class SavingsMovementModel(Base):
    __tablename__ = "savings_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(String, nullable=False) # 'withdrawal' or 'deposit'
    file_id = Column(String, ForeignKey("processed_files.id"), nullable=True)
    goal_name = Column(String, nullable=True)
    metadata_json = Column(JSON, default={})

class ProcessedFileModel(Base):
    __tablename__ = "processed_files"

    id = Column(String, primary_key=True)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    bank_name = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
