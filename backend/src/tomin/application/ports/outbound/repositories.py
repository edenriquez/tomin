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
    Tag,
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

    def get(self, transaction_id: UUID) -> Transaction | None: ...

    def list_by_ids(self, user_id: UUID, ids: list[UUID]) -> list[Transaction]:
        """Fetch specific transactions, scoped to their owner.

        The scope is the security boundary for bulk operations over
        client-supplied ids: rows the caller does not own simply do not come
        back, so they cannot be acted on.
        """
        ...

    def update(self, transaction: Transaction) -> None:
        """Persist the user-editable fields of an existing transaction.

        Narrow by design: the statement owns date, amount, currency and
        direction, so only description, category (+ its source), notes and the
        stats exclusion travel through here.
        """
        ...

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


class DuplicateTagError(ValueError):
    """Two tags with the same slug for one user.

    Declared on the *port* rather than in the adapter: "slugs are unique per
    user" is part of the contract every implementation owes, so the use case
    can name the failure without importing a database module. Subclasses
    ``ValueError`` so an unhandled path still degrades to a 400; the blueprint
    upgrades it to the more precise 409.
    """


@runtime_checkable
class TagRepository(Protocol):
    """Tags plus the ``transaction_tags`` bridge.

    The bridge is the **record of truth** for tagging. The cube's
    ``fact_transactions.tag_ids`` and ``bridge_transaction_tag`` are derived
    copies, rebuildable from here.
    """

    def list_for_user(self, user_id: UUID) -> list[Tag]: ...

    def get(self, tag_id: UUID) -> Tag | None: ...

    def add(self, tag: Tag) -> None: ...

    def update(self, tag: Tag) -> None: ...

    def delete(self, tag_id: UUID) -> None: ...

    def transaction_ids_for_tag(self, tag_id: UUID) -> list[UUID]:
        """Which transactions carry this tag, so their cube rows can be re-derived."""
        ...

    def replace_for_transaction(self, transaction_id: UUID, tag_ids: list[UUID]) -> None:
        """Set one transaction's tag list wholesale."""
        ...

    def attach_to_transactions(self, tag_id: UUID, transaction_ids: list[UUID]) -> None:
        """Add one tag to many transactions without disturbing their other tags."""
        ...


@runtime_checkable
class CategoryRepository(Protocol):
    def get_all(self) -> list[Category]: ...

    def add_many(self, categories: list[Category]) -> None: ...


@runtime_checkable
class MerchantRepository(Protocol):
    def get_all(self) -> list[Merchant]: ...

    def add_many(self, merchants: list[Merchant]) -> None: ...
