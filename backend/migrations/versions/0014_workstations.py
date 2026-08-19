"""Workstations — a user's saved lenses over the ledger.

A workstation is a named rule ("description contains 'recarga', between $10 and
$300") plus the movements the user struck out of it by hand. Everything the
Workspace view shows is that rule handed to the ordinary metrics as filters, so
this table stores a *question*, never an answer: nothing derived lives here and
the cube stays fully rebuildable.

**The rule is one JSON column, not five typed ones.** Its shape is enforced by
``domain.entities.WorkstationRule`` and re-validated against the metric catalog
on every save, so the column cannot hold something the query layer would later
reject — the same "a layout is only saveable if it is queryable" property the
dashboards table rests on (0005). The payoff is that adding a sixth condition is
a domain change rather than a migration.

``excluded_tx_ids`` is a JSON array of ids rather than a bridge table with a
foreign key, deliberately. Deleting a statement takes its transactions with it;
a stale id in here is harmless (it excludes a row that no longer exists) whereas
a cascade would silently rewrite the user's own exceptions behind their back.

Server-side, not localStorage: a rule someone crafted is user data, not a panel
preference. That is also why it gets RLS in this migration rather than a later
one — per 0003, adding a user-owned table and enabling its policy are the same
reviewable change, so a new table cannot reach Supabase unprotected.

Revision ID: 0014
Revises: 0013
Create Date: 2026-08-18
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workstations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("rule", sa.JSON(), nullable=False),
        sa.Column("excluded_tx_ids", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    # The sidebar reads "every workstation of mine, newest first" and nothing
    # else; one composite index is the whole access pattern.
    op.create_index(
        "ix_workstations_user_created", "workstations", ["user_id", "created_at"]
    )

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.workstations ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_workstations" ON public.workstations;')
    op.execute(
        'CREATE POLICY "owner_all_workstations" ON public.workstations '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute('DROP POLICY IF EXISTS "owner_all_workstations" ON public.workstations;')
    op.drop_index("ix_workstations_user_created", table_name="workstations")
    op.drop_table("workstations")
