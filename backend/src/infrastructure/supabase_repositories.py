from typing import List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from ..domain.entities.models import Transaction, Category, ProcessedFile, SavingsMovement, Merchant, MerchantLabel
from ..domain.repositories.interfaces import (
    TransactionRepository, 
    CategoryRepository, 
    ProcessedFileRepository,
    SavingsMovementRepository,
    MerchantRepository
)
from .models import (
    TransactionModel, 
    CategoryModel, 
    ProcessedFileModel, 
    SavingsMovementModel,
    MerchantModel,
    MerchantLabelModel
)

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
            merchant_id=transaction.merchant_id,
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
                merchant_id=tx.merchant_id,
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
                merchant_id=r.merchant_id,
                merchant_name=r.merchant_name,
                is_recurrent=r.is_recurrent,
                metadata=r.metadata_json
            ) for r in results
        ]
    
    def get_by_user_and_file_hash(self, user_id: UUID, file_hash: str, start_date: datetime, end_date: datetime) -> List[Transaction]:
        results = self.db.query(TransactionModel).filter(
            TransactionModel.user_id == user_id,
            TransactionModel.file_id == file_hash,
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
                merchant_id=r.merchant_id,
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
                merchant_id=r.merchant_id,
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
                merchant_id=r.merchant_id,
                merchant_name=r.merchant_name,
                is_recurrent=r.is_recurrent,
                metadata=r.metadata_json
            ) for r in results
        ]

    def update_recurrent_status(self, transaction_ids: List[UUID], is_recurrent: bool) -> None:
        self.db.query(TransactionModel).filter(
            TransactionModel.id.in_(transaction_ids)
        ).update({"is_recurrent": is_recurrent}, synchronize_session=False)
        self.db.commit()

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

class SupabaseMerchantRepository(MerchantRepository):
    def __init__(self, db: Session):
        self.db = db

    def save(self, merchant: Merchant) -> None:
        db_merchant = MerchantModel(
            id=merchant.id,
            name=merchant.name,
            icon=merchant.icon,
            default_category_id=merchant.default_category_id,
            created_at=merchant.created_at
        )
        self.db.add(db_merchant)
        self.db.commit()

    def get_all(self) -> List[Merchant]:
        results = self.db.query(MerchantModel).all()
        return [
            Merchant(
                name=r.name,
                id=r.id,
                icon=r.icon,
                default_category_id=r.default_category_id,
                created_at=r.created_at
            ) for r in results
        ]

    def get_by_id(self, merchant_id: UUID) -> Optional[Merchant]:
        r = self.db.query(MerchantModel).filter(MerchantModel.id == merchant_id).first()
        if not r: return None
        return Merchant(
            name=r.name,
            id=r.id,
            icon=r.icon,
            default_category_id=r.default_category_id,
            created_at=r.created_at
        )

    def add_label(self, label: MerchantLabel) -> None:
        db_label = MerchantLabelModel(
            id=label.id,
            merchant_id=label.merchant_id,
            label=label.label,
            is_active=label.is_active,
            created_at=label.created_at
        )
        self.db.add(db_label)
        self.db.commit()

    def get_labels(self) -> List[MerchantLabel]:
        results = self.db.query(MerchantLabelModel).all()
        return [
            MerchantLabel(
                merchant_id=r.merchant_id,
                label=r.label,
                id=r.id,
                is_active=r.is_active,
                created_at=r.created_at
            ) for r in results
        ]

    def update_transaction_merchant(self, transaction_id: UUID, merchant_id: UUID) -> None:
        self.db.query(TransactionModel).filter(
            TransactionModel.id == transaction_id
        ).update({"merchant_id": merchant_id}, synchronize_session=False)
        self.db.commit()
 
    def update_transaction_merchant_and_name(self, transaction_id: UUID, merchant_id: UUID, merchant_name: str) -> None:
        self.db.query(TransactionModel).filter(
            TransactionModel.id == transaction_id
        ).update({"merchant_id": merchant_id, "merchant_name": merchant_name}, synchronize_session=False)
        self.db.commit()
