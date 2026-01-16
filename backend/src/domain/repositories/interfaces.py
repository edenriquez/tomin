from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..entities.models import Transaction, Category, Forecast, ProcessedFile, SavingsMovement, Merchant, MerchantLabel

class SavingsMovementRepository(ABC):
    @abstractmethod
    def save_all(self, movements: List[SavingsMovement]) -> None:
        pass

    @abstractmethod
    def get_by_user(self, user_id: UUID) -> List[SavingsMovement]:
        pass

class TransactionRepository(ABC):
    @abstractmethod
    def save(self, transaction: Transaction) -> None:
        pass

    @abstractmethod
    def save_all(self, transactions: List[Transaction]) -> None:
        pass

    @abstractmethod
    def get_by_user(self, user_id: UUID, start_date: datetime, end_date: datetime) -> List[Transaction]:
        pass
    
    @abstractmethod
    def get_by_user_and_file_hash(self, user_id: UUID, file_hash: str, start_date: datetime, end_date: datetime) -> List[Transaction]:
        pass

    @abstractmethod
    def get_recurrent_by_user(self, user_id: UUID) -> List[Transaction]:
        pass

    @abstractmethod
    def get_all(self, user_id: UUID, limit: int = 20) -> List[Transaction]:
        pass

    @abstractmethod
    def update_recurrent_status(self, transaction_ids: List[UUID], is_recurrent: bool) -> None:
        pass

class CategoryRepository(ABC):
    @abstractmethod
    def get_all(self, user_id: Optional[UUID] = None) -> List[Category]:
        pass

    @abstractmethod
    def get_by_id(self, category_id: UUID) -> Optional[Category]:
        pass

class ForecastRepository(ABC):
    @abstractmethod
    def save(self, forecast: Forecast) -> None:
        pass

    @abstractmethod
    def get_latest_by_user(self, user_id: UUID) -> Optional[Forecast]:
        pass

class MerchantRepository(ABC):
    @abstractmethod
    def save(self, merchant: Merchant) -> None:
        pass

    @abstractmethod
    def get_all(self) -> List[Merchant]:
        pass

    @abstractmethod
    def get_by_id(self, merchant_id: UUID) -> Optional[Merchant]:
        pass

    @abstractmethod
    def add_label(self, label: MerchantLabel) -> None:
        pass

    @abstractmethod
    def get_labels(self) -> List[MerchantLabel]:
        pass

    @abstractmethod
    def update_transaction_merchant(self, transaction_id: UUID, merchant_id: UUID) -> None:
        pass
    
    @abstractmethod
    def update_transaction_merchant_and_name(self, transaction_id: UUID, merchant_id: UUID, merchant_name: str) -> None:
        pass

class ProcessedFileRepository(ABC):
    @abstractmethod
    def save(self, processed_file: ProcessedFile) -> None:
        pass

    @abstractmethod
    def exists(self, user_id: UUID, file_hash: str) -> bool:
        pass

    @abstractmethod
    def get_all_by_user(self, user_id: UUID) -> List[ProcessedFile]:
        pass

    @abstractmethod
    def count_by_user(self, user_id: UUID) -> int:
        pass

    @abstractmethod
    def delete_by_id(self, user_id: UUID, file_id: str) -> bool:
        pass
