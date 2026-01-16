from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from ...domain.repositories.interfaces import TransactionRepository, SavingsMovementRepository
from ..dtos.financial_dtos import FinancialSummaryDTO

class GetFinancialSummary:
    def __init__(
        self, 
        transaction_repo: TransactionRepository,
        savings_repo: SavingsMovementRepository
    ):
        self.transaction_repo = transaction_repo
        self.savings_repo = savings_repo

    def execute(self, user_id: UUID) -> FinancialSummaryDTO:
        now = datetime.now()
        # Start of current month
        start_current = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # End of current month
        if now.month == 12:
            end_current = now.replace(year=now.year + 1, month=1, day=1) - timedelta(seconds=1)
        else:
            end_current = now.replace(month=now.month + 1, day=1) - timedelta(seconds=1)

        # Last month
        if now.month == 1:
            start_last = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start_last = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end_last = start_current - timedelta(seconds=1)

        # GET ALL DATA (simplified for now, ideally repositories handle aggregation)
        all_transactions = self.transaction_repo.get_by_user(user_id, datetime(2000, 1, 1), now)
        all_savings = self.savings_repo.get_by_user(user_id)

        # 1. TOTALS (LIFETIME)
        # Savings are positive for deposits, negative for withdrawals
        total_savings = sum(s.amount for s in all_savings)
        # Transactions: positive are spending, negative are payments (abonos)
        # So sum(amount) == Outstanding Debt
        total_debt = sum(t.amount for t in all_transactions)
        
        total_balance = total_savings - total_debt

        # 2. MONTHLY SUMMARY
        current_txs = [t for t in all_transactions if start_current <= t.date <= end_current]
        monthly_spending = sum(t.amount for t in current_txs if t.amount > 0)
        monthly_income = abs(sum(t.amount for t in current_txs if t.amount < 0))

        # 3. TRENDS
        last_month_txs = [t for t in all_transactions if start_last <= t.date <= end_last]
        last_month_spending = sum(t.amount for t in last_month_txs if t.amount > 0)
        
        spending_trend = 0.0
        if last_month_spending > 0:
            spending_trend = ((monthly_spending - last_month_spending) / last_month_spending) * 100

        # Balance trend is harder without history snapshoting, so let's simplify to monthly spend delta
        balance_trend = 0.0 # Placeholder
        
        return FinancialSummaryDTO(
            total_balance=total_balance,
            total_savings=total_savings,
            total_debt=total_debt,
            monthly_spending=monthly_spending,
            monthly_income=monthly_income,
            spending_trend=spending_trend,
            balance_trend=balance_trend
        )
