from typing import List
from uuid import UUID
from ...domain.entities.models import Transaction
from ...domain.repositories.interfaces import TransactionRepository

class DetectRecurrentTransactions:
    """
    Analyzes historical transactions to identify recurring patterns 
    (e.g., same amount and merchant monthly).
    """
    def __init__(self, transaction_repo: TransactionRepository):
        self.transaction_repo = transaction_repo

    def execute(self, user_id: UUID) -> List[Transaction]:
        # This is where the core logic or AI logic would live.
        # For now, it returns transactions flagged as recurrent from the repo.
        # In a real implementation, this might call an AI service or use a pattern matching algorithm.
        return self.transaction_repo.get_recurrent_by_user(user_id)
