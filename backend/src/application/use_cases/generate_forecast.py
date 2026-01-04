from typing import List, Dict
from uuid import UUID
from datetime import datetime, timedelta
from ...domain.entities.models import Transaction, Category
from ...domain.repositories.interfaces import TransactionRepository, CategoryRepository
from ..dtos.forecast_dtos import FullForecastDTO, ForecastCategoryDetailDTO

class GenerateForecast:
    def __init__(
        self,
        transaction_repo: TransactionRepository,
        category_repo: CategoryRepository
    ):
        self.transaction_repo = transaction_repo
        self.category_repo = category_repo

    def execute(self, user_id: UUID, target_month: int, target_year: int) -> FullForecastDTO:
        # 1. Get history (e.g., last 90 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        transactions = self.transaction_repo.get_by_user(user_id, start_date, end_date)
        categories = self.category_repo.get_all()
        
        # 2. Calculate category averages
        cat_totals: Dict[UUID, List[float]] = {cat.id: [] for cat in categories}
        # In a real app, we'd group by month. Here we simplify to average over 3 months.
        for tx in transactions:
            if tx.category_id in cat_totals:
                cat_totals[tx.category_id].append(tx.amount)
        
        forecast_categories = []
        total_projected = 0.0
        
        for cat in categories:
            amounts = cat_totals.get(cat.id, [])
            avg = sum(amounts) / 3 if amounts else 0.0 # simple 3-month avg
            
            # Simple heuristic: if there's a recurrent flag or low variance, it's a fixed cost
            is_fixed = any(tx.is_recurrent for tx in transactions if tx.category_id == cat.id)
            
            projected = avg
            total_projected += projected
            
            forecast_categories.append(ForecastCategoryDetailDTO(
                category_id=cat.id,
                category_name=cat.name,
                historical_average=avg,
                projected_amount=projected,
                is_fixed_cost=is_fixed
            ))

        # 3. Placeholder for income (could come from historical deposits)
        projected_income = 50000.0 # Mocked for now (average Mexican professional / user meta)
        
        return FullForecastDTO(
            month=target_month,
            year=target_year,
            total_projected_income=projected_income,
            total_projected_expenses=total_projected,
            estimated_savings=max(0, projected_income - total_projected),
            categories=forecast_categories,
            optimization_suggestions=self._generate_suggestions(forecast_categories)
        )

    def _generate_suggestions(self, categories: List[ForecastCategoryDetailDTO]) -> List[str]:
        suggestions = []
        for cat in categories:
            if not cat.is_fixed_cost and cat.projected_amount > 5000:
                suggestions.append(f"Considera reducir gastos en {cat.category_name}. Un 10% de ahorro liberaría ${cat.projected_amount * 0.1:,.2f} MXN.")
        return suggestions
