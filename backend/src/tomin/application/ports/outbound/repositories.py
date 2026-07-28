from __future__ import annotations

from collections.abc import Iterator
from typing import Protocol, runtime_checkable
from uuid import UUID

from ....domain.entities import (
    Account,
    Category,
    Dashboard,
    DashboardWidget,
    Goal,
    Merchant,
    Statement,
    Transaction,
)
from ...dtos.extraction import ParsedTransaction  # noqa: F401  (re-exported convenience)


@runtime_checkable
class TransactionRepository(Protocol):
    def add_many(self, transactions: list[Transaction]) -> None: ...

    def list_for_user(
        self,
        user_id: UUID,
        *,
        start=None,
        end=None,
        category_id: UUID | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Transaction]: ...

    def count_for_user(self, user_id: UUID, **filters) -> int: ...

    def delete_for_statement(self, statement_id: UUID) -> list[UUID]:
        """Delete every transaction derived from a statement.

        Returns the ids that were removed so the caller can prune the cube.
        """
        ...

    def iter_for_user(self, user_id: UUID, *, batch_size: int = 500) -> Iterator[Transaction]:
        """Stream **every** transaction for a user, oldest first.

        A separate method rather than `list_for_user(limit=10_000_000)`: a
        magic limit is a silent correctness bug the day someone exceeds it, and
        a full-history read wants to be streamed rather than materialised.
        Used by the cube rebuild.
        """
        ...


@runtime_checkable
class StatementRepository(Protocol):
    def add(self, statement: Statement) -> None: ...

    def update(self, statement: Statement) -> None: ...

    def get(self, statement_id: UUID) -> Statement | None: ...

    def list_for_user(self, user_id: UUID) -> list[Statement]: ...

    def delete(self, statement_id: UUID) -> None: ...

    def exists_hash(self, user_id: UUID, file_hash: str) -> bool: ...


@runtime_checkable
class AccountRepository(Protocol):
    def add(self, account: Account) -> None: ...

    def list_for_user(self, user_id: UUID) -> list[Account]: ...


@runtime_checkable
class GoalRepository(Protocol):
    def add(self, goal: Goal) -> None: ...

    def update(self, goal: Goal) -> None: ...

    def get(self, goal_id: UUID) -> Goal | None: ...

    def list_for_user(self, user_id: UUID) -> list[Goal]: ...

    def delete(self, goal_id: UUID) -> None: ...


@runtime_checkable
class DashboardRepository(Protocol):
    def get_default_for_user(self, user_id: UUID) -> Dashboard | None: ...

    def add(self, dashboard: Dashboard) -> None: ...

    def replace_widgets(self, dashboard_id: UUID, widgets: list[DashboardWidget]) -> None:
        """Swap a dashboard's whole widget list. A layout is saved as a unit."""
        ...


@runtime_checkable
class CategoryRepository(Protocol):
    def get_all(self) -> list[Category]: ...

    def add_many(self, categories: list[Category]) -> None: ...


@runtime_checkable
class MerchantRepository(Protocol):
    def get_all(self) -> list[Merchant]: ...

    def add_many(self, merchants: list[Merchant]) -> None: ...
