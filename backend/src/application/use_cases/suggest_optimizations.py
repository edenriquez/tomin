from typing import List
from uuid import UUID
from ...domain.repositories.interfaces import TransactionRepository
from ..dtos.financial_dtos import ForecastSuggestionDTO

class SuggestOptimizations:
    """
    Business logic to identify 'fat' that can be cut.
    Uses historical patterns and category benchmarks.
    """
    def __init__(self, transaction_repo: TransactionRepository):
        self.transaction_repo = transaction_repo

    def execute(self, user_id: UUID) -> List[ForecastSuggestionDTO]:
        # In a real scenario, this would use a more complex model or LLM.
        # Logic: 
        # 1. Identify non-essential categories (Entertainment, Eating out).
        # 2. Compare against previous months.
        # 3. Suggest a 15% reduction if spending is above average.
        
        # Mock logic for demonstration:
        return [
            ForecastSuggestionDTO(
                category_id=UUID('00000000-0000-0000-0000-000000000001'), # Mock Entertainment
                category_name="Entretenimiento",
                suggested_reduction=200.0,
                reason="Tus suscripciones digitales han subido un 20% este trimestre.",
                potential_savings=2400.0 # Yearly
            ),
            ForecastSuggestionDTO(
                category_id=UUID('00000000-0000-0000-0000-000000000002'), # Mock Food
                category_name="Comida a domicilio",
                suggested_reduction=500.0,
                reason="Has pedido UberEats 5 veces más que el promedio local.",
                potential_savings=6000.0
            )
        ]
