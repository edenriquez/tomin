from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..entities.models import Transaction, Category, Forecast

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
    def get_recurrent_by_user(self, user_id: UUID) -> List[Transaction]:
        pass

class CategoryRepository(ABC):
    @abstractmethod
    def get_all(self) -> List[Category]:
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
