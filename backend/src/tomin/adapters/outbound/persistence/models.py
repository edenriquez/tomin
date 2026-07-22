from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# UUIDs are stored as 36-char strings for portability across SQLite/Postgres.
UUIDStr = String(36)


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


class GoalModel(Base):
    __tablename__ = "goals"

    id: Mapped[str] = mapped_column(UUIDStr, primary_key=True)
    user_id: Mapped[str] = mapped_column(UUIDStr, index=True)
    name: Mapped[str] = mapped_column(String(160))
    target_amount: Mapped[Numeric] = mapped_column(Numeric(14, 2))
    current_amount: Mapped[Numeric] = mapped_column(Numeric(14, 2), default=0)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
