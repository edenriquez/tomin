from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime, timedelta
from calendar import monthrange
from collections import defaultdict
from ...domain.entities.models import Transaction, RecurringBill
from ...domain.repositories.interfaces import TransactionRepository

class GetRecurringTransactions:
    def __init__(self, transaction_repo: TransactionRepository):
        self.transaction_repo = transaction_repo

    def execute(self, user_id: UUID, month: Optional[int] = None, year: Optional[int] = None, period: Optional[str] = None) -> List[RecurringBill]:
        """
        Retrieves recurring transactions for a specific period and aggregates them.
        """
        now = datetime.now()
        
        # Determine date range
        if period == 'weekly':
            start_date = now - timedelta(days=7)
            end_date = now
        elif period == 'biweekly':
            start_date = now - timedelta(days=15)
            end_date = now
        elif period == 'last_month':
            first = now.replace(day=1)
            end_date = first - timedelta(days=1)
            start_date = end_date.replace(day=1)
        elif period == 'last_3_months':
            start_date = now - timedelta(days=90)
            end_date = now
        else:
            target_month = month if month else now.month
            target_year = year if year else now.year
            _, last_day = monthrange(target_year, target_month)
            start_date = datetime(target_year, target_month, 1)
            end_date = datetime(target_year, target_month, last_day, 23, 59, 59)

        # 1. Fetch all recurring transactions in the designated range
        # Note: We might want slightly more history to get accurate metadata
        transactions = self.transaction_repo.get_by_user(user_id, start_date, end_date)
        recurring_transactions = [tx for tx in transactions if tx.is_recurrent]

        # 2. Fetch categories for mapping
        from ...domain.repositories.interfaces import CategoryRepository # If exists, or just use transaction metadata if available
        # But wait, let's keep it simple and just use the merchant's category or the items' category
        
        # 3. Group by Merchant
        groups = defaultdict(list)
        for tx in recurring_transactions:
            # Match by name; fallback to description if merchant identification failed
            key = tx.merchant_name or tx.description
            groups[key].append(tx)

        # 4. Aggregate into RecurringBill objects
        bills = []
        for name, group in groups.items():
            group.sort(key=lambda x: x.date, reverse=True)
            
            last_tx = group[0]
            analysis = last_tx.metadata.get("recurring_analysis", {})
            
            # Use metadata from detection if available
            avg_amount = analysis.get("avg_amount", sum(t.amount for t in group)/len(group))
            frequency = analysis.get("frequency", "unknown")
            
            next_date_str = analysis.get("next_expected")
            next_expected = datetime.fromisoformat(next_date_str) if next_date_str else None

            # Determine status
            status = "active"
            if next_expected and next_expected < now - timedelta(days=7):
                status = "potential_churn" if next_expected > now - timedelta(days=30) else "cancelled"

            bills.append(RecurringBill(
                merchant_name=name,
                avg_amount=avg_amount,
                last_amount=last_tx.amount,
                total_period_amount=sum(t.amount for t in group),
                frequency=frequency,
                occurrences_in_period=len(group),
                next_expected_date=next_expected,
                transactions=group,
                status=status,
                category_name=None, # To be expanded if category repo is injected
                category_color=None,
                category_icon=None
            ))

        # Sort bills by total amount descending
        bills.sort(key=lambda x: x.total_period_amount, reverse=True)
        return bills
