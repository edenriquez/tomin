"""Per-user transaction aliases — human names for processor gibberish.

"POCK*SUPERLECLERC MX" is a grocery store near the user's home, and only the
user knows that. An alias maps a normalized match label to the name the user
wants to read; ingest applies it to `description` (the editable label) while
`raw_description` keeps the bank's original text untouched, so the evidence
never degrades.

Per-user for the same reason as ``user_category_labels`` (0010): what "the
store near home" means is not shareable. Unique on (user_id, label) — one
label maps to one name; re-teaching replaces rather than accumulates.

User-owned table, so RLS ships in the same migration (dialect-guarded, same
shape as 0007/0010).

Revision ID: 0011
Revises: 0010
Create Date: 2026-08-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "user_aliases",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("alias", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "label", name="uq_user_aliases_user_label"),
    )
    op.create_index("ix_user_aliases_user_id", "user_aliases", ["user_id"])

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.user_aliases ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_user_aliases" ON public.user_aliases;')
    op.execute(
        'CREATE POLICY "owner_all_user_aliases" ON public.user_aliases '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute('DROP POLICY IF EXISTS "owner_all_user_aliases" ON public.user_aliases;')
    op.drop_index("ix_user_aliases_user_id", table_name="user_aliases")
    op.drop_table("user_aliases")
