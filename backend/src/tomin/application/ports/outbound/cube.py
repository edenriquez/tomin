from __future__ import annotations

from datetime import date
from typing import Protocol, runtime_checkable
from uuid import UUID

from ...dtos.analytics import CategorySpend, MonthlyPoint, SpendingSummary
from ....domain.entities import Transaction


@runtime_checkable
class CubeWriter(Protocol):
    """Feeds structured transactions into the analytics cube (DuckDB)."""

    def upsert_transactions(self, transactions: list[Transaction]) -> None: ...

    def delete_transactions(self, tx_ids: list[UUID]) -> None: ...

    def refresh_rollups(self, user_id: UUID) -> None: ...


@runtime_checkable
class CubeReader(Protocol):
    """Fast analytical reads served from the cube."""

    def spending_summary(
        self, user_id: UUID, start: date | None = None, end: date | None = None
    ) -> SpendingSummary: ...

    def spending_by_category(
        self, user_id: UUID, start: date | None = None, end: date | None = None
    ) -> list[CategorySpend]: ...

    def monthly_series(self, user_id: UUID, months: int = 12) -> list[MonthlyPoint]: ...
