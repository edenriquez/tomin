from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    false as sa_false,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# UUIDs are stored as 36-char strings for portability across SQLite/Postgres.
UUIDStr = String(36)


def _created_at() -> Mapped[datetime]:
    """`created_at` audit column, matching the Supabase DDL's `timestamptz default now()`."""
    return mapped_column(DateTime, server_default=func.now(), nullable=False)


class CategoryModel(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(60), nullable=True)
    categorization_labels: Mapped[list] = mapped_column(JSON, default=list)


class MerchantModel(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    labels: Mapped[list] = mapped_column(JSON, default=list)


class AccountModel(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUIDStr, index=True)
    bank: Mapped[str | None] = mapped_column(String(120), nullable=True)
    alias: Mapped[str | None] = mapped_column(String(120), nullable=True)
    account_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = _created_at()


class StatementModel(Base):
    __tablename__ = "statements"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUIDStr, index=True)
    account_id: Mapped[str | None] = mapped_column(UUIDStr, nullable=True)
    source_type: Mapped[str] = mapped_column(String(20))
    bank: Mapped[str | None] = mapped_column(String(120), nullable=True)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    file_hash: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime)


class TransactionModel(Base):
    __tablename__ = "transactions"

    # `amount` is always a non-negative magnitude; `tx_type` alone carries
    # direction (see docs/redesign-plan.md §2 "Sign convention").
    __table_args__ = (CheckConstraint("amount >= 0", name="ck_transactions_amount_non_negative"),)

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUIDStr, index=True)
    statement_id: Mapped[str | None] = mapped_column(
        UUIDStr, ForeignKey("statements.id"), nullable=True
    )
    tx_date: Mapped[date] = mapped_column(Date, index=True)
    raw_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    amount: Mapped[Numeric] = mapped_column(Numeric(14, 2))
    currency: Mapped[str] = mapped_column(String(3), default="MXN")
    tx_type: Mapped[str] = mapped_column(String(10), default="expense")
    status: Mapped[str] = mapped_column(String(12), default="completed")
    category_id: Mapped[str | None] = mapped_column(UUIDStr, nullable=True)
    merchant_id: Mapped[str | None] = mapped_column(UUIDStr, nullable=True)
    # Who decided the category: the ingest classifier ("auto") or the user
    # ("user"). Kept so a future re-classification pass can improve its own
    # guesses without ever overwriting a correction someone made by hand.
    category_source: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="auto", default="auto"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # User-level exclusion from analytics. Distinct from `is_transfer`, which is
    # a derived fact about the movement; this is an opinion about it.
    excluded_from_stats: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=sa_false(), default=False
    )
    created_at: Mapped[datetime] = _created_at()
    # Nullable rather than defaulted: a row that has never been edited has no
    # meaningful update time, and now() would claim one.
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class DashboardModel(Base):
    __tablename__ = "dashboards"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUIDStr, index=True)
    name: Mapped[str] = mapped_column(String(120))
    is_default: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class DashboardWidgetModel(Base):
    """A widget row. Owned by its dashboard, and deleted with it.

    ``ondelete="CASCADE"`` rather than an ORM cascade: the layout is replaced
    wholesale on every save, and a widget whose dashboard is gone is not a
    recoverable state worth leaving to application code to remember.
    """

    __tablename__ = "dashboard_widgets"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    dashboard_id: Mapped[str] = mapped_column(
        UUIDStr, ForeignKey("dashboards.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    size: Mapped[str] = mapped_column(String(8), default="md")
    metric_id: Mapped[str] = mapped_column(String(64))
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    title_override: Mapped[str | None] = mapped_column(String(120), nullable=True)


class GoalModel(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUIDStr, index=True)
    name: Mapped[str] = mapped_column(String(160))
    target_amount: Mapped[Numeric] = mapped_column(Numeric(14, 2))
    current_amount: Mapped[Numeric] = mapped_column(Numeric(14, 2), default=0)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = _created_at()
