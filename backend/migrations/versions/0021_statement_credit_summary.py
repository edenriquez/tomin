"""Statements carry the card figures printed on them.

A credit-card statement asks for three numbers the movement list never
shows: the payment that avoids interest, the minimum payment, and the day
both are due. They are read off the statement text at ingest
(``domain/services/credit_summary.py``) and stored on the statement itself.
All three nullable: every debit statement has none, and rows ingested before
this column existed stay as they are until re-uploaded.

Revision ID: 0021
Revises: 0020
Create Date: 2026-09-19
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: str | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("statements") as batch:
        batch.add_column(
            sa.Column("credit_no_interest_payment", sa.Numeric(14, 2), nullable=True)
        )
        batch.add_column(sa.Column("credit_minimum_payment", sa.Numeric(14, 2), nullable=True))
        batch.add_column(sa.Column("credit_due_date", sa.Date(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("statements") as batch:
        batch.drop_column("credit_due_date")
        batch.drop_column("credit_minimum_payment")
        batch.drop_column("credit_no_interest_payment")
