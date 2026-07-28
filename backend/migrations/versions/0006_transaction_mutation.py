"""Editable transactions: category_source, notes, excluded_from_stats, updated_at.

There is currently no way to correct anything (docs/redesign-plan.md §7, B5).
``PATCH /api/transactions/{id}`` needs somewhere to record *that* a human made
the call, not just what they chose -- otherwise a later re-classification pass
would silently overwrite the correction. Hence ``category_source``, defaulting
to ``'auto'`` so every existing row reads as the classifier's guess, which it
was.

``excluded_from_stats`` lands here rather than with the transfer flags (0008)
because it is a different kind of statement: ``is_transfer`` is a derived fact
about the movement, this is the user's opinion about it. Both end up as
``Measure.default_filters`` members.

``updated_at`` is nullable on purpose. A row that has never been edited has no
update time, and defaulting to ``now()`` would claim one.

Adds no table, so no new RLS policy: ``transactions`` is already covered by
0003.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-27
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_COLUMNS = ("category_source", "notes", "excluded_from_stats", "updated_at")


def upgrade() -> None:
    # batch_alter_table: SQLite rejects ADD COLUMN with some non-constant
    # defaults and cannot add a NOT NULL column to a populated table without a
    # rebuild. On PostgreSQL this degrades to a plain ALTER. Same reasoning as
    # 0002.
    with op.batch_alter_table("transactions") as batch:
        batch.add_column(
            sa.Column(
                "category_source",
                sa.String(10),
                nullable=False,
                server_default="auto",
            )
        )
        batch.add_column(sa.Column("notes", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column(
                "excluded_from_stats",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.add_column(sa.Column("updated_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("transactions") as batch:
        for column in reversed(_COLUMNS):
            batch.drop_column(column)
