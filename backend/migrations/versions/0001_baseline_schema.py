"""Baseline schema.

This revision reproduces *exactly* what ``Database.create_all()`` produced
before Alembic existed. It is the stamp point: an existing database that was
created by ``create_all`` is already at this revision and must be marked as
such rather than migrated::

    alembic stamp 0001

Fresh databases run it normally. Schema convergence with ``supabase_setup.sql``
(``created_at`` columns, RLS) lives in the revisions that follow, so that both
kinds of database converge on the same target.

Revision ID: 0001
Revises:
Create Date: 2026-07-27
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("icon", sa.String(60), nullable=True),
        sa.Column("categorization_labels", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "merchants",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "accounts",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("bank", sa.String(120), nullable=True),
        sa.Column("alias", sa.String(120), nullable=True),
        sa.Column("account_type", sa.String(40), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])

    op.create_table(
        "statements",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("account_id", UUIDStr, nullable=True),
        sa.Column("source_type", sa.String(20), nullable=False),
        sa.Column("bank", sa.String(120), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("file_hash", sa.String(64), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_statements_user_id", "statements", ["user_id"])
    op.create_index("ix_statements_file_hash", "statements", ["file_hash"])

    op.create_table(
        "transactions",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("statement_id", UUIDStr, nullable=True),
        sa.Column("tx_date", sa.Date(), nullable=False),
        sa.Column("raw_description", sa.String(500), nullable=True),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("tx_type", sa.String(10), nullable=False),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("category_id", UUIDStr, nullable=True),
        sa.Column("merchant_id", UUIDStr, nullable=True),
        sa.ForeignKeyConstraint(["statement_id"], ["statements.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])
    op.create_index("ix_transactions_tx_date", "transactions", ["tx_date"])

    op.create_table(
        "goals",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("target_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("current_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_goals_user_id", "goals", ["user_id"])


def downgrade() -> None:
    op.drop_table("goals")
    op.drop_table("transactions")
    op.drop_table("statements")
    op.drop_table("accounts")
    op.drop_table("merchants")
    op.drop_table("categories")
