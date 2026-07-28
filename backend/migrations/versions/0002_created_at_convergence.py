"""Converge models.py with supabase_setup.sql: add created_at audit columns.

``models.py`` and ``supabase_setup.sql`` had drifted. models.py is now the
single source of truth and ``supabase_setup.sql`` keeps only what SQLAlchemy
cannot express (the ``profiles`` table, the ``handle_new_user`` trigger and
grants). This revision closes the column-level half of the drift.

Drift resolved here
-------------------
* ``accounts.created_at``, ``transactions.created_at``, ``goals.created_at`` —
  present in the SQL, absent from the models. Added to the models, hence added
  here. Backfilled with ``now()`` for existing rows; a wrong-but-monotonic
  creation timestamp beats a NULL that every consumer has to special-case.
* ``statements.uploaded_at`` already serves as the statements table's creation
  timestamp, so no separate ``created_at`` is added there.

Drift resolved *against* the SQL — merchant labels
--------------------------------------------------
``supabase_setup.sql`` modelled merchant labels as a child table
(``merchant_labels``); ``models.py`` models them as a JSON column
(``merchants.labels``). **The JSON column wins.** Labels are read as a whole
list, exactly once per request, by ``CategorizationService`` — which receives
reference data by value and never queries. There is no query that filters or
joins on an individual label, so the child table buys normalisation nobody
spends and costs a join plus an N+1 risk on every categorisation pass. If a
future feature needs per-label querying (e.g. "which merchants carry label X"),
promoting the JSON array back to a bridge table is a mechanical migration.
The ``merchant_labels`` table is therefore dropped from the SQL file, not from
here: it was never created by the Python side.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-27
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TABLES = ("accounts", "transactions", "goals")


def upgrade() -> None:
    # Idempotent on purpose. This revision targets legacy create_all() DBs,
    # and SQLite DDL is non-transactional: a crash mid-revision (e.g. two dev
    # processes racing the first-boot migration) leaves some columns added
    # with the version still at 0001, and a naive re-run then dies on
    # "duplicate column". Skipping already-present columns makes the retry
    # converge instead.
    inspector = sa.inspect(op.get_bind())
    for table in _TABLES:
        existing = {c["name"] for c in inspector.get_columns(table)}
        if "created_at" in existing:
            continue
        # batch_alter_table because SQLite rejects a plain ADD COLUMN with a
        # non-constant default (CURRENT_TIMESTAMP); batch mode rebuilds the
        # table instead. On PostgreSQL it degrades to a normal ALTER.
        # server_default=now() both backfills existing rows and keeps the
        # column NOT NULL for inserts that don't mention it.
        with op.batch_alter_table(table) as batch:
            batch.add_column(
                sa.Column(
                    "created_at",
                    sa.DateTime(),
                    nullable=False,
                    server_default=sa.func.now(),
                ),
            )


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.drop_column(table, "created_at")
