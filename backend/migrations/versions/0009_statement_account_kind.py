"""Statement ``account_kind`` — the user labels what kind of account it is.

A statement from a credit card and one from a payroll account are different
objects to every metric that will eventually branch on them (credit-card
"expenses" include payments *to* the card), but the parsers cannot reliably
tell them apart across banks. So the kind is **user-declared** via
``PATCH /api/statements/<id>`` and NULL until declared — an honest unknown,
never a guessed default. Values are the ``AccountKind`` enum, validated at the
API boundary; the column is a plain string because the set will grow and a DB
enum makes every addition a migration.

No backfill: there is nothing to derive it from, which is the point.

Adds no table, so no new RLS policy: ``statements`` is already covered by 0003.

Revision ID: 0009
Revises: 0008
Create Date: 2026-08-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "statements",
        sa.Column("account_kind", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("statements", "account_kind")
