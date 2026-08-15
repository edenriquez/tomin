"""Statement ``source`` — which custody path the contents arrived by.

F1 of docs/custody-plan.md gives the product a second ingest path: the phone
extracts the text and the original file never leaves it. The dashboard wants
to say so per statement ("custodiado en tu teléfono"), and that is not
derivable from anything else on the row — ``source_type`` says what kind of
*document* it was (bank PDF vs SAT XML), never how it got here. So it is
stored.

NOT NULL with ``server_default='web'``, which doubles as the backfill: every
statement that predates this migration came in through the upload endpoint,
where the file did touch the server. Defaulting to 'device' would retroactively
claim a custody guarantee those rows never had — the one wrong answer here.

Ten characters is deliberate slack over the two values in
:class:`StatementSource`; a plain string rather than a DB enum for the same
reason as 0009's ``account_kind``, so growing the vocabulary is not a
migration.

Adds no table, so no new RLS policy: ``statements`` is already covered by 0003.

Revision ID: 0013
Revises: 0012
Create Date: 2026-08-16
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # batch_alter_table: SQLite cannot add a NOT NULL column to a populated
    # table without rebuilding it. On PostgreSQL this degrades to a plain
    # ALTER. Same reasoning as 0008.
    with op.batch_alter_table("statements") as batch:
        batch.add_column(
            sa.Column("source", sa.String(length=10), nullable=False, server_default="web")
        )


def downgrade() -> None:
    with op.batch_alter_table("statements") as batch:
        batch.drop_column("source")
