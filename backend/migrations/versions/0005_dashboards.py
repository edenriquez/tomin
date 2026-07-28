"""User-composed dashboards: `dashboards` + `dashboard_widgets`, with RLS.

The home screen stops being a fixed summary and becomes a grid the user
composes from the metric catalog (docs/redesign-plan.md §1, §4). Two tables:
the dashboard, and its ordered widgets.

``dashboard_widgets`` carries no ``user_id``. Ownership is the parent's, and
duplicating it would create a second version of the truth that an UPDATE could
desynchronise. The RLS policy therefore reaches through the FK rather than
comparing a local column -- which is exactly why the policy has to be written
by hand here rather than looping over ``USER_OWNED_TABLES`` like 0003 does.

RLS lives in the migration, dialect-guarded, so a new user-owned table cannot
reach Supabase unprotected: creating it and protecting it are one reviewable
change. SQLite (local dev, tests) has no RLS, so that half is a no-op there.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-27
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "dashboards",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dashboards_user_id", "dashboards", ["user_id"])

    op.create_table(
        "dashboard_widgets",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("dashboard_id", UUIDStr, nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("size", sa.String(8), nullable=False),
        sa.Column("metric_id", sa.String(64), nullable=False),
        sa.Column("params", sa.JSON(), nullable=False),
        sa.Column("title_override", sa.String(120), nullable=True),
        sa.ForeignKeyConstraint(["dashboard_id"], ["dashboards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dashboard_widgets_dashboard_id", "dashboard_widgets", ["dashboard_id"])

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_dashboards" ON public.dashboards;')
    op.execute(
        'CREATE POLICY "owner_all_dashboards" ON public.dashboards '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )

    op.execute("ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_dashboard_widgets" ON public.dashboard_widgets;')
    # Ownership is inherited: a widget is visible exactly when its dashboard is.
    op.execute(
        'CREATE POLICY "owner_all_dashboard_widgets" ON public.dashboard_widgets '
        "FOR ALL USING (EXISTS (SELECT 1 FROM public.dashboards d "
        "WHERE d.id = dashboard_widgets.dashboard_id AND auth.uid()::text = d.user_id)) "
        "WITH CHECK (EXISTS (SELECT 1 FROM public.dashboards d "
        "WHERE d.id = dashboard_widgets.dashboard_id AND auth.uid()::text = d.user_id));"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            'DROP POLICY IF EXISTS "owner_all_dashboard_widgets" ON public.dashboard_widgets;'
        )
        op.execute('DROP POLICY IF EXISTS "owner_all_dashboards" ON public.dashboards;')

    op.drop_index("ix_dashboard_widgets_dashboard_id", table_name="dashboard_widgets")
    op.drop_table("dashboard_widgets")
    op.drop_index("ix_dashboards_user_id", table_name="dashboards")
    op.drop_table("dashboards")
