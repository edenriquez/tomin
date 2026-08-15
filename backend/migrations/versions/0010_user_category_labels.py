"""Per-user learned categorization labels.

When a user corrects a category and asks to "apply to similar", the matched
text becomes vocabulary — but *their* vocabulary. Categories and merchants are
global tables shared by every account, and one user teaching the system that
"deposito lalo" means Ingresos must never leak into another user's
classification. So learned labels live here, keyed by user, and
``CategorizationService`` merges them with the global index at ingest.

Labels are stored normalized (``domain/services/categorization.normalize``) so
matching at ingest and uniqueness here agree about case and accents. The
triple is the identity: re-teaching the same label is a no-op, and the same
text may legitimately point at different categories for different users.

User-owned table, so RLS ships in the same migration (dialect-guarded, same
shape as 0007).

Revision ID: 0010
Revises: 0009
Create Date: 2026-08-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "user_category_labels",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("category_id", UUIDStr, nullable=False),
        sa.Column("label", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "category_id", "label", name="uq_user_category_labels_triple"
        ),
    )
    op.create_index("ix_user_category_labels_user_id", "user_category_labels", ["user_id"])

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.user_category_labels ENABLE ROW LEVEL SECURITY;")
    op.execute(
        'DROP POLICY IF EXISTS "owner_all_user_category_labels" '
        "ON public.user_category_labels;"
    )
    op.execute(
        'CREATE POLICY "owner_all_user_category_labels" ON public.user_category_labels '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            'DROP POLICY IF EXISTS "owner_all_user_category_labels" '
            "ON public.user_category_labels;"
        )
    op.drop_index("ix_user_category_labels_user_id", table_name="user_category_labels")
    op.drop_table("user_category_labels")
