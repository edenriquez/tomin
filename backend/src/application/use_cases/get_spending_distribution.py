from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
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

    def execute(self, user_id: UUID, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, period: Optional[str] = None) -> List[SpendingByCategoryDTO]:
        now = datetime.now()
        
        if period:
            if period == 'weekly':
                start_date = now - timedelta(days=7)
                end_date = now
            elif period == 'biweekly':
                start_date = now - timedelta(days=15)
                end_date = now
            elif period == 'last_month':
                # First day of current month
                first_day_curr = now.replace(day=1)
                # Last day of prev month = first day of curr - 1 day
                end_date = first_day_curr - timedelta(days=1)
                # First day of prev month
                start_date = end_date.replace(day=1)
            elif period == 'last_3_months':
                start_date = now - timedelta(days=90)
                end_date = now
        
        if not start_date:
            start_date = now - timedelta(days=60)
        if not end_date:
            end_date = now

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
