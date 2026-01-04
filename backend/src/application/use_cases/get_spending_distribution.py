from typing import List
from uuid import UUID
from datetime import datetime
from ...domain.repositories.interfaces import TransactionRepository, CategoryRepository
from ..dtos.financial_dtos import SpendingByCategoryDTO

class GetSpendingDistribution:
    def __init__(
        self, 
        transaction_repo: TransactionRepository,
        category_repo: CategoryRepository
    ):
        self.transaction_repo = transaction_repo
        self.category_repo = category_repo

    def execute(self, user_id: UUID, start_date: datetime, end_date: datetime) -> List[SpendingByCategoryDTO]:
        transactions = self.transaction_repo.get_by_user(user_id, start_date, end_date)
        categories = {cat.id: cat for cat in self.category_repo.get_all()}
        
        totals = {}
        grand_total = 0.0
        
        for tx in transactions:
            if tx.category_id not in totals:
                totals[tx.category_id] = 0.0
            totals[tx.category_id] += tx.amount
            grand_total += tx.amount
            
        results = []
        for cat_id, amount in totals.items():
            category = categories.get(cat_id)
            if category:
                results.append(SpendingByCategoryDTO(
                    category_id=cat_id,
                    category_name=category.name,
                    total_amount=amount,
                    percentage=(amount / grand_total * 100) if grand_total > 0 else 0,
                    color=category.color
                ))
                
        # Sort by weight descending
        return sorted(results, key=lambda x: x.total_amount, reverse=True)
