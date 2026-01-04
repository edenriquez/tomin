from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class ForecastCategoryDetailDTO(BaseModel):
    category_id: UUID
    category_name: str
    historical_average: float
    projected_amount: float
    is_fixed_cost: bool
    adjustment: float = 0.0

class FullForecastDTO(BaseModel):
    month: int
    year: int
    total_projected_income: float
    total_projected_expenses: float
    estimated_savings: float
    categories: List[ForecastCategoryDetailDTO]
    optimization_suggestions: List[str] = []
