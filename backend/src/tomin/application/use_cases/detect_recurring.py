from __future__ import annotations

from uuid import UUID

from ...domain.services.recurrence import RecurrenceService
from ..dtos.analytics import RecurringItem
from ..ports.outbound import TransactionRepository


class DetectRecurringUseCase:
    """Detects recurring expenses / subscriptions for a user."""

    def __init__(
        self, transactions: TransactionRepository, service: RecurrenceService | None = None
    ) -> None:
        self._transactions = transactions
        self._service = service or RecurrenceService()

    def execute(self, *, user_id: UUID) -> list[RecurringItem]:
        # Pull a generous window; recurrence needs history.
        txs = self._transactions.list_for_user(user_id, limit=5000)
        groups = self._service.detect(txs)
        return [
            RecurringItem(
                label=g.label,
                average_amount=g.average_amount,
                frequency=g.frequency,
                occurrences=g.occurrences,
            )
            for g in groups
        ]
