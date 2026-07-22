from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from ..value_objects.enums import TransactionStatus, TxType


@dataclass(slots=True)
class Transaction:
    user_id: UUID
    tx_date: date
    amount: Decimal
    raw_description: str
    description: str | None = None
    currency: str = "MXN"
    tx_type: TxType = TxType.EXPENSE
    status: TransactionStatus = TransactionStatus.COMPLETED
    statement_id: UUID | None = None
    category_id: UUID | None = None
    merchant_id: UUID | None = None
    id: UUID = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.id is None:
            self.id = uuid4()
        if not isinstance(self.amount, Decimal):
            self.amount = Decimal(str(self.amount))
        if self.description is None:
            self.description = self.raw_description
