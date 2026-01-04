from uuid import UUID
from ..dtos.forecast_dtos import FullForecastDTO, ForecastCategoryDetailDTO

class AdjustForecast:
    """
    Handles 'What-if' scenarios. Recalculates the forecast based on user-defined 
    adjustments to specific categories.
    """
    def execute(self, current_forecast: FullForecastDTO, category_id: UUID, new_budget: float) -> FullForecastDTO:
        updated_categories = []
        new_total_expenses = 0.0
        
        for cat in current_forecast.categories:
            if cat.category_id == category_id:
                # Update the target category
                updated_cat = ForecastCategoryDetailDTO(
                    category_id=cat.category_id,
                    category_name=cat.category_name,
                    historical_average=cat.historical_average,
                    projected_amount=new_budget,
                    is_fixed_cost=cat.is_fixed_cost,
                    adjustment=new_budget - cat.historical_average
                )
                updated_categories.append(updated_cat)
                new_total_expenses += new_budget
            else:
                updated_categories.append(cat)
                new_total_expenses += cat.projected_amount
                
        return FullForecastDTO(
            month=current_forecast.month,
            year=current_forecast.year,
            total_projected_income=current_forecast.total_projected_income,
            total_projected_expenses=new_total_expenses,
            estimated_savings=max(0, current_forecast.total_projected_income - new_total_expenses),
            categories=updated_categories,
            optimization_suggestions=current_forecast.optimization_suggestions # Could be re-evaluated
        )
