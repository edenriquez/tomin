"""Where people actually click.

The question "how should Movimientos be ordered?" has no good answer from a
chair: whether a person hunts outliers on the chart, scrolls the list, or
searches by name is a fact about that person, and the honest way to find out is
to record what they do and read it back later. One append-only table, one row
per interaction, no opinion about what the rows mean yet.

Per 0003, the table and its RLS policy ship as one change: a new user-owned
table cannot reach Supabase unprotected.

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-25
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: str | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "ui_events",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        # "movimientos.row_select", "window.select" -- dotted, view first, so a
        # GROUP BY prefix answers "which view gets the attention".
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("path", sa.String(200), nullable=False),
        # Small, flat, and whatever the client found relevant: {"mode": "scatter"}.
        sa.Column("props", sa.JSON(), nullable=False),
        # The client's clock, so a batch flushed late still orders correctly.
        sa.Column("occurred_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ui_events_user_id", "ui_events", ["user_id"])
    op.create_index("ix_ui_events_user_name", "ui_events", ["user_id", "name"])
    op.create_index("ix_ui_events_occurred_at", "ui_events", ["occurred_at"])

    if op.get_bind().dialect.name != "postgresql":
        return
    op.execute("ALTER TABLE public.ui_events ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_ui_events" ON public.ui_events;')
    op.execute(
        'CREATE POLICY "owner_all_ui_events" ON public.ui_events '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )


def downgrade() -> None:
    op.drop_index("ix_ui_events_occurred_at", table_name="ui_events")
    op.drop_index("ix_ui_events_user_name", table_name="ui_events")
    op.drop_index("ix_ui_events_user_id", table_name="ui_events")
    op.drop_table("ui_events")
