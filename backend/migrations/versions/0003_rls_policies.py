"""Row Level Security for user-owned tables (Postgres only).

RLS lives in a migration rather than in ``supabase_setup.sql`` so that a new
user-owned table cannot reach Supabase unprotected: adding the table and
enabling its policy are the same reviewable change.

Dialect-guarded — SQLite (local dev, tests) has no RLS, so this is a no-op
there. The guard is on the *bind's* dialect, not on a setting, so it is correct
for whatever database the migration actually runs against.

``auth.uid()`` is a Supabase function and returns ``uuid``; ``user_id`` is
stored as a 36-char string for SQLite portability, so the comparison casts.

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-27
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

USER_OWNED_TABLES = ("accounts", "statements", "transactions", "goals")


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in USER_OWNED_TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f'DROP POLICY IF EXISTS "owner_all_{table}" ON public.{table};')
        op.execute(
            f'CREATE POLICY "owner_all_{table}" ON public.{table} '
            f"FOR ALL USING (auth.uid()::text = user_id) "
            f"WITH CHECK (auth.uid()::text = user_id);"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in USER_OWNED_TABLES:
        op.execute(f'DROP POLICY IF EXISTS "owner_all_{table}" ON public.{table};')
        op.execute(f"ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;")
