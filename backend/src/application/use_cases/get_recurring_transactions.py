from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from calendar import monthrange
from ...domain.entities.models import Transaction
from ...domain.repositories.interfaces import TransactionRepository

class GetRecurringTransactions:
    def __init__(self, transaction_repo: TransactionRepository):
        self.transaction_repo = transaction_repo

    def execute(self, user_id: UUID, month: Optional[int] = None, year: Optional[int] = None, period: Optional[str] = None) -> List[Transaction]:
        """
        Retrieves recurring transactions for a specific period.
        Supports 'weekly', 'biweekly', 'last_month', 'last_3_months', or custom month/year.
        Dates are calculated relative to 'now'.
        """
        now = datetime.now()
        
        if period == 'weekly':
            # Last 7 days
            start_date = now - timedelta(days=7)
            end_date = now
        elif period == 'biweekly':
            # Last 15 days
            start_date = now - timedelta(days=15)
            end_date = now
        elif period == 'last_month':
            # Previous calendar month
            first = now.replace(day=1)
            end_date = first - timedelta(days=1)
            start_date = end_date.replace(day=1)
        elif period == 'last_3_months':
            # Last 90 days
            start_date = now - timedelta(days=90)
            end_date = now
        else:
            # Default to provided month/year or current month
            target_month = month if month else now.month
            target_year = year if year else now.year
            
            _, last_day = monthrange(target_year, target_month)
            start_date = datetime(target_year, target_month, 1)
            end_date = datetime(target_year, target_month, last_day, 23, 59, 59)

        # Retrieve all transactions for the period
        transactions = self.transaction_repo.get_by_user(user_id, start_date, end_date)

        # Filter for recurring only
        recurring_transactions = [tx for tx in transactions if tx.is_recurrent]
        
        return recurring_transactions
