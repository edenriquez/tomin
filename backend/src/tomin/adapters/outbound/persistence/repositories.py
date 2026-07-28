from __future__ import annotations

from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select

from ....domain.entities import (
    Account,
    Category,
    Goal,
    Merchant,
    Statement,
    Transaction,
)
from ....domain.value_objects.enums import (
    SourceType,
    StatementStatus,
    TransactionStatus,
    TxType,
)
from .db import Database
from .models import (
    AccountModel,
    CategoryModel,
    GoalModel,
    MerchantModel,
    StatementModel,
    TransactionModel,
)


def _u(value) -> str:
    return str(value)


# --- mappers --------------------------------------------------------------
def _to_transaction(m: TransactionModel) -> Transaction:
    return Transaction(
        id=UUID(m.id),
        user_id=UUID(m.user_id),
        statement_id=UUID(m.statement_id) if m.statement_id else None,
        tx_date=m.tx_date,
        amount=Decimal(str(m.amount)),
        raw_description=m.raw_description or "",
        description=m.description,
        currency=m.currency,
        tx_type=TxType(m.tx_type),
        status=TransactionStatus(m.status),
        category_id=UUID(m.category_id) if m.category_id else None,
        merchant_id=UUID(m.merchant_id) if m.merchant_id else None,
    )


class SqlTransactionRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def add_many(self, transactions: list[Transaction]) -> None:
        with self._db.session() as s:
            for t in transactions:
                s.add(
                    TransactionModel(
                        id=_u(t.id),
                        user_id=_u(t.user_id),
                        statement_id=_u(t.statement_id) if t.statement_id else None,
                        tx_date=t.tx_date,
                        raw_description=t.raw_description,
                        description=t.description,
                        amount=t.amount,
                        currency=t.currency,
                        tx_type=t.tx_type.value,
                        status=t.status.value,
                        category_id=_u(t.category_id) if t.category_id else None,
                        merchant_id=_u(t.merchant_id) if t.merchant_id else None,
                    )
                )

    def _base_query(self, user_id, start, end, category_id, search):
        stmt = select(TransactionModel).where(TransactionModel.user_id == _u(user_id))
        if start:
            stmt = stmt.where(TransactionModel.tx_date >= start)
        if end:
            stmt = stmt.where(TransactionModel.tx_date <= end)
        if category_id:
            stmt = stmt.where(TransactionModel.category_id == _u(category_id))
        if search:
            stmt = stmt.where(TransactionModel.description.ilike(f"%{search}%"))
        return stmt

    def list_for_user(
        self,
        user_id: UUID,
        *,
        start: date | None = None,
        end: date | None = None,
        category_id: UUID | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Transaction]:
        with self._db.session() as s:
            stmt = (
                self._base_query(user_id, start, end, category_id, search)
                .order_by(TransactionModel.tx_date.desc())
                .limit(limit)
                .offset(offset)
            )
            return [_to_transaction(m) for m in s.scalars(stmt).all()]

    def iter_for_user(self, user_id: UUID, *, batch_size: int = 500) -> Iterator[Transaction]:
        """Stream a user's entire history, oldest first, in batches.

        ``yield_per`` keeps the result set off the heap; rows are converted to
        detached domain entities as they arrive, so the caller never touches a
        live ORM object.
        """
        with self._db.session() as s:
            stmt = (
                select(TransactionModel)
                .where(TransactionModel.user_id == _u(user_id))
                .order_by(TransactionModel.tx_date, TransactionModel.id)
                .execution_options(yield_per=batch_size)
            )
            for m in s.scalars(stmt):
                yield _to_transaction(m)

    def count_for_user(self, user_id: UUID, **filters) -> int:
        with self._db.session() as s:
            stmt = self._base_query(
                user_id,
                filters.get("start"),
                filters.get("end"),
                filters.get("category_id"),
                filters.get("search"),
            )
            return s.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    def delete_for_statement(self, statement_id: UUID) -> list[UUID]:
        with self._db.session() as s:
            stmt = select(TransactionModel).where(
                TransactionModel.statement_id == _u(statement_id)
            )
            models = list(s.scalars(stmt).all())
            for m in models:
                s.delete(m)
            return [UUID(m.id) for m in models]


class SqlStatementRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def add(self, statement: Statement) -> None:
        with self._db.session() as s:
            s.add(self._to_model(statement))

    def update(self, statement: Statement) -> None:
        with self._db.session() as s:
            m = s.get(StatementModel, _u(statement.id))
            if m is None:
                s.add(self._to_model(statement))
            else:
                m.status = statement.status.value
                m.period_start = statement.period_start
                m.period_end = statement.period_end
                m.bank = statement.bank

    def get(self, statement_id: UUID) -> Statement | None:
        with self._db.session() as s:
            m = s.get(StatementModel, _u(statement_id))
            return self._to_entity(m) if m else None

    def list_for_user(self, user_id: UUID) -> list[Statement]:
        with self._db.session() as s:
            stmt = (
                select(StatementModel)
                .where(StatementModel.user_id == _u(user_id))
                .order_by(StatementModel.uploaded_at.desc())
            )
            return [self._to_entity(m) for m in s.scalars(stmt).all()]

    def delete(self, statement_id: UUID) -> None:
        with self._db.session() as s:
            m = s.get(StatementModel, _u(statement_id))
            if m:
                s.delete(m)

    def exists_hash(self, user_id: UUID, file_hash: str) -> bool:
        with self._db.session() as s:
            stmt = select(StatementModel.id).where(
                StatementModel.user_id == _u(user_id),
                StatementModel.file_hash == file_hash,
            )
            return s.scalar(stmt) is not None

    @staticmethod
    def _to_model(st: Statement) -> StatementModel:
        return StatementModel(
            id=_u(st.id),
            user_id=_u(st.user_id),
            account_id=_u(st.account_id) if st.account_id else None,
            source_type=st.source_type.value,
            bank=st.bank,
            period_start=st.period_start,
            period_end=st.period_end,
            status=st.status.value,
            file_hash=st.file_hash,
            uploaded_at=st.uploaded_at,
        )

    @staticmethod
    def _to_entity(m: StatementModel) -> Statement:
        return Statement(
            id=UUID(m.id),
            user_id=UUID(m.user_id),
            account_id=UUID(m.account_id) if m.account_id else None,
            source_type=SourceType(m.source_type),
            bank=m.bank,
            period_start=m.period_start,
            period_end=m.period_end,
            status=StatementStatus(m.status),
            file_hash=m.file_hash,
            uploaded_at=m.uploaded_at,
        )


class SqlAccountRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def add(self, account: Account) -> None:
        with self._db.session() as s:
            s.add(
                AccountModel(
                    id=_u(account.id),
                    user_id=_u(account.user_id),
                    bank=account.bank,
                    alias=account.alias,
                    account_type=account.account_type,
                )
            )

    def list_for_user(self, user_id: UUID) -> list[Account]:
        with self._db.session() as s:
            stmt = select(AccountModel).where(AccountModel.user_id == _u(user_id))
            return [
                Account(
                    id=UUID(m.id),
                    user_id=UUID(m.user_id),
                    bank=m.bank,
                    alias=m.alias,
                    account_type=m.account_type,
                )
                for m in s.scalars(stmt).all()
            ]


class SqlGoalRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def add(self, goal: Goal) -> None:
        with self._db.session() as s:
            s.add(self._to_model(goal))

    def update(self, goal: Goal) -> None:
        with self._db.session() as s:
            m = s.get(GoalModel, _u(goal.id))
            if m:
                m.name = goal.name
                m.target_amount = goal.target_amount
                m.current_amount = goal.current_amount
                m.target_date = goal.target_date

    def get(self, goal_id: UUID) -> Goal | None:
        with self._db.session() as s:
            m = s.get(GoalModel, _u(goal_id))
            return self._to_entity(m) if m else None

    def list_for_user(self, user_id: UUID) -> list[Goal]:
        with self._db.session() as s:
            stmt = select(GoalModel).where(GoalModel.user_id == _u(user_id))
            return [self._to_entity(m) for m in s.scalars(stmt).all()]

    def delete(self, goal_id: UUID) -> None:
        with self._db.session() as s:
            m = s.get(GoalModel, _u(goal_id))
            if m:
                s.delete(m)

    @staticmethod
    def _to_model(g: Goal) -> GoalModel:
        return GoalModel(
            id=_u(g.id),
            user_id=_u(g.user_id),
            name=g.name,
            target_amount=g.target_amount,
            current_amount=g.current_amount,
            target_date=g.target_date,
        )

    @staticmethod
    def _to_entity(m: GoalModel) -> Goal:
        return Goal(
            id=UUID(m.id),
            user_id=UUID(m.user_id),
            name=m.name,
            target_amount=Decimal(str(m.target_amount)),
            current_amount=Decimal(str(m.current_amount)),
            target_date=m.target_date,
        )


class SqlCategoryRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def get_all(self) -> list[Category]:
        with self._db.session() as s:
            return [
                Category(
                    id=UUID(m.id),
                    name=m.name,
                    color=m.color,
                    icon=m.icon,
                    categorization_labels=list(m.categorization_labels or []),
                )
                for m in s.scalars(select(CategoryModel)).all()
            ]

    def add_many(self, categories: list[Category]) -> None:
        with self._db.session() as s:
            for c in categories:
                s.add(
                    CategoryModel(
                        id=_u(c.id),
                        name=c.name,
                        color=c.color,
                        icon=c.icon,
                        categorization_labels=list(c.categorization_labels),
                    )
                )


class SqlMerchantRepository:
    def __init__(self, db: Database) -> None:
        self._db = db

    def get_all(self) -> list[Merchant]:
        with self._db.session() as s:
            return [
                Merchant(id=UUID(m.id), name=m.name, labels=list(m.labels or []))
                for m in s.scalars(select(MerchantModel)).all()
            ]

    def add_many(self, merchants: list[Merchant]) -> None:
        with self._db.session() as s:
            for m in merchants:
                s.add(MerchantModel(id=_u(m.id), name=m.name, labels=list(m.labels)))
