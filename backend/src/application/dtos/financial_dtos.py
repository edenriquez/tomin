from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class TransactionDTO(BaseModel):
    id: UUID
    amount: float
    description: str
    date: datetime
    category_name: Optional[str]
    merchant_name: Optional[str]
    is_recurrent: bool

class SpendingByCategoryDTO(BaseModel):
    category_id: UUID
    category_name: str
    total_amount: float
    percentage: float
    color: str

class ForecastSuggestionDTO(BaseModel):
    category_id: UUID
    category_name: str
    suggested_reduction: float
    reason: str
    potential_savings: float

class FinancialSummaryDTO(BaseModel):
    total_balance: float
    total_savings: float
    total_debt: float
    monthly_spending: float
    monthly_income: float
    spending_trend: float # Percentage change vs last month
    balance_trend: float # Percentage change vs last month
