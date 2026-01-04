from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..domain.entities.models import Transaction, Category, Forecast
from ..domain.repositories.interfaces import TransactionRepository, CategoryRepository, ForecastRepository

class InMemoryTransactionRepository(TransactionRepository):
    def __init__(self):
        self.transactions: List[Transaction] = []

    def save(self, transaction: Transaction) -> None:
        self.transactions.append(transaction)

    def save_all(self, transactions: List[Transaction]) -> None:
        self.transactions.extend(transactions)

    def get_by_user(self, user_id: UUID, start_date: datetime, end_date: datetime) -> List[Transaction]:
        return [tx for tx in self.transactions if tx.date >= start_date and tx.date <= end_date]

    def get_recurrent_by_user(self, user_id: UUID) -> List[Transaction]:
        return [tx for tx in self.transactions if tx.is_recurrent]

class InMemoryCategoryRepository(CategoryRepository):
    def __init__(self):
        self.categories: List[Category] = [
            Category(name="Vivienda & Servicios", color="#3b82f6", icon="home"),
            Category(name="Comida & Supermercado", color="#a855f7", icon="shopping_cart"),
            Category(name="Transporte", color="#eab308", icon="commute"),
            Category(name="Entretenimiento", color="#ec4899", icon="movie"),
        ]

    def get_all(self) -> List[Category]:
        return self.categories

    def get_by_id(self, category_id: UUID) -> Optional[Category]:
        return next((c for c in self.categories if c.id == category_id), None)

class InMemoryForecastRepository(ForecastRepository):
    def __init__(self):
        self.forecasts: List[Forecast] = []

    def save(self, forecast: Forecast) -> None:
        self.forecasts.append(forecast)

    def get_latest_by_user(self, user_id: UUID) -> Optional[Forecast]:
        return self.forecasts[-1] if self.forecasts else None
