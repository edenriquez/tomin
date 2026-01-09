from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from ..domain.entities.models import Transaction, Category, ProcessedFile, SavingsMovement
from ..domain.repositories.interfaces import (
    TransactionRepository, 
    CategoryRepository, 
    ProcessedFileRepository,
    SavingsMovementRepository
)
from .models import TransactionModel, CategoryModel, ProcessedFileModel, SavingsMovementModel

class SupabaseTransactionRepository(TransactionRepository):
    def __init__(self, db: Session):
        self.db = db

    def save(self, transaction: Transaction) -> None:
        db_tx = TransactionModel(
            id=transaction.id,
            amount=transaction.amount,
            description=transaction.description,
            date=transaction.date,
            user_id=transaction.user_id,
            category_id=transaction.category_id,
            file_id=transaction.file_id,
            merchant_name=transaction.merchant_name,
            is_recurrent=transaction.is_recurrent,
            metadata_json=transaction.metadata,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        self.db.add(db_tx)
        self.db.commit()

    def save_all(self, transactions: List[Transaction]) -> None:
        db_txs = [
            TransactionModel(
                id=tx.id,
                amount=tx.amount,
                description=tx.description,
                date=tx.date,
                user_id=tx.user_id,
                category_id=tx.category_id,
                file_id=tx.file_id,
                merchant_name=tx.merchant_name,
                is_recurrent=tx.is_recurrent,
                metadata_json=tx.metadata,
                created_at=datetime.now(),
                updated_at=datetime.now()
            ) for tx in transactions
        ]
        self.db.add_all(db_txs)
        self.db.commit()

    def get_by_user(self, user_id: UUID, start_date: datetime, end_date: datetime) -> List[Transaction]:
        results = self.db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id,
            TransactionModel.date >= start_date,
            TransactionModel.date <= end_date
        ).all()
        return [
            Transaction(
                amount=r.amount,
                description=r.description,
                date=r.date,
                user_id=r.user_id,
                id=r.id,
                category_id=r.category_id,
                file_id=r.file_id,
                merchant_name=r.merchant_name,
                is_recurrent=r.is_recurrent,
                metadata=r.metadata_json
            ) for r in results
        ]

    def get_recurrent_by_user(self, user_id: UUID) -> List[Transaction]:
        results = self.db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id,
            TransactionModel.is_recurrent == True
        ).all()
        return [
            Transaction(
                amount=r.amount,
                description=r.description,
                date=r.date,
                user_id=r.user_id,
                id=r.id,
                category_id=r.category_id,
                file_id=r.file_id,
                merchant_name=r.merchant_name,
                is_recurrent=r.is_recurrent,
                metadata=r.metadata_json
            ) for r in results
        ]

    def get_all(self, user_id: UUID, limit: int = 20) -> List[Transaction]:
        results = self.db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id
        ).order_by(TransactionModel.date.desc()).limit(limit).all()
        return [
            Transaction(
                amount=r.amount,
                description=r.description,
                date=r.date,
                user_id=r.user_id,
                id=r.id,
                category_id=r.category_id,
                file_id=r.file_id,
                merchant_name=r.merchant_name,
                is_recurrent=r.is_recurrent,
                metadata=r.metadata_json
            ) for r in results
        ]

class SupabaseCategoryRepository(CategoryRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, user_id: Optional[UUID] = None) -> List[Category]:
        # Currently categories are global, so user_id is ignored
        results = self.db.query(CategoryModel).all()
        return [
            Category(
                name=r.name,
                color=r.color,
                icon=r.icon,
                id=r.id,
                parent_category_id=r.parent_category_id,
                categorization_labels=r.categorization_labels or []
            ) for r in results
        ]

    def get_by_id(self, category_id: UUID) -> Optional[Category]:
        r = self.db.query(CategoryModel).filter(CategoryModel.id == category_id).first()
        if not r: return None
        return Category(
            name=r.name,
            color=r.color,
            icon=r.icon,
            id=r.id,
            parent_category_id=r.parent_category_id,
            categorization_labels=r.categorization_labels or []
        )

class SupabaseProcessedFileRepository(ProcessedFileRepository):
    def __init__(self, db: Session):
        self.db = db

    def save(self, processed_file: ProcessedFile) -> None:
        db_file = ProcessedFileModel(
            id=processed_file.hash,
            user_id=processed_file.user_id,
            bank_name=processed_file.bank_name,
            created_at=processed_file.created_at
        )
        self.db.add(db_file)
        self.db.commit()

    def exists(self, user_id: UUID, file_hash: str) -> bool:
        return self.db.query(ProcessedFileModel).filter(
            ProcessedFileModel.user_id == user_id,
            ProcessedFileModel.id == file_hash
        ).first() is not None

class SupabaseSavingsMovementRepository(SavingsMovementRepository):
    def __init__(self, db: Session):
        self.db = db

    def save_all(self, movements: List[SavingsMovement]) -> None:
        db_mvmts = [
            SavingsMovementModel(
                id=m.id,
                amount=m.amount,
                description=m.description,
                date=m.date,
                user_id=m.user_id,
                type=m.type,
                file_id=m.file_id,
                goal_name=m.goal_name,
                metadata_json=m.metadata
            ) for m in movements
        ]
        self.db.add_all(db_mvmts)
        self.db.commit()

    def get_by_user(self, user_id: UUID) -> List[SavingsMovement]:
        results = self.db.query(SavingsMovementModel).filter(
            SavingsMovementModel.user_id == user_id
        ).all()
        return [
            SavingsMovement(
                amount=r.amount,
                description=r.description,
                date=r.date,
                user_id=r.user_id,
                type=r.type,
                goal_name=r.goal_name,
                file_id=r.file_id,
                id=r.id,
                metadata=r.metadata_json
            ) for r in results
        ]
