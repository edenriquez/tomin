from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from uuid import UUID, uuid4

from ..value_objects.enums import TransactionStatus, TxType


@dataclass(slots=True)
class Transaction:
    """A single money movement.

    Sign convention (docs/redesign-plan.md §2): ``amount`` is always a
    **non-negative magnitude** and ``tx_type`` alone carries direction. Sign is
    reintroduced only at aggregation time, via :attr:`signed_amount`.

    A negative ``amount`` is a **parser bug**, so it raises rather than being
    silently ``abs()``-ed. Silent absing is how a negative-signed expense used
    to reach the cube and *subtract* from ``total_expense``.
    """

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
        if self.amount < 0:
            raise ValueError(
                f"Transaction.amount must be a non-negative magnitude, got {self.amount}. "
                "Direction belongs in tx_type; a negative amount means the parser "
                "leaked a sign."
            )
        if self.description is None:
            self.description = self.raw_description

    @property
    def signed_amount(self) -> Decimal:
        """``+amount`` for income, ``-amount`` for expense.

        The only place sign is reintroduced. Use this for net figures (cash
        flow, running balances); use :attr:`amount` for directional totals.
        """
        return self.amount if self.tx_type is TxType.INCOME else -self.amount
