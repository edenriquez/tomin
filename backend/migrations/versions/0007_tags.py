"""Tags: `tags` + `transaction_tags` bridge, with RLS (docs/redesign-plan.md B6).

Tag groups are the one metric in §3 marked "easy": CRUD plus a bridge table.
The care goes into two places.

**Uniqueness is per user.** ``unique(user_id, slug)``, not ``unique(slug)``.
Two people may both have a "viaje"; one person may not have two, or the picker
shows the same label twice and totals split silently between them.

**The bridge carries no ``user_id``.** Ownership belongs to the two rows it
joins, and a third copy is a third thing an UPDATE can desynchronise. The RLS
policy therefore reaches through the FK -- the same reasoning, and the same
hand-written shape, as ``dashboard_widgets`` in 0005. It checks the *tag* side:
a transaction and its tags are owned by the same person by construction, and
one EXISTS is cheaper than two.

Both tables are user-owned, so both get RLS here, dialect-guarded. Creating a
table and protecting it stay one reviewable change.

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-28
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "tags",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("kind", sa.String(20), nullable=False, server_default="plain"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "slug", name="uq_tags_user_slug"),
    )
    op.create_index("ix_tags_user_id", "tags", ["user_id"])

    op.create_table(
        "transaction_tags",
        sa.Column("transaction_id", UUIDStr, nullable=False),
        sa.Column("tag_id", UUIDStr, nullable=False),
        sa.Column("source", sa.String(10), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["transaction_id"], ["transactions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        # The pair is the identity: "tagged twice with the same tag" is not a
        # state worth representing.
        sa.PrimaryKeyConstraint("transaction_id", "tag_id"),
    )
    op.create_index("ix_transaction_tags_tag_id", "transaction_tags", ["tag_id"])

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_tags" ON public.tags;')
    op.execute(
        'CREATE POLICY "owner_all_tags" ON public.tags '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )

    op.execute("ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;")
    op.execute('DROP POLICY IF EXISTS "owner_all_transaction_tags" ON public.transaction_tags;')
    # Ownership is inherited: a bridge row is visible exactly when its tag is.
    op.execute(
        'CREATE POLICY "owner_all_transaction_tags" ON public.transaction_tags '
        "FOR ALL USING (EXISTS (SELECT 1 FROM public.tags t "
        "WHERE t.id = transaction_tags.tag_id AND auth.uid()::text = t.user_id)) "
        "WITH CHECK (EXISTS (SELECT 1 FROM public.tags t "
        "WHERE t.id = transaction_tags.tag_id AND auth.uid()::text = t.user_id));"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            'DROP POLICY IF EXISTS "owner_all_transaction_tags" ON public.transaction_tags;'
        )
        op.execute('DROP POLICY IF EXISTS "owner_all_tags" ON public.tags;')

    op.drop_index("ix_transaction_tags_tag_id", table_name="transaction_tags")
    op.drop_table("transaction_tags")
    op.drop_index("ix_tags_user_id", table_name="tags")
    op.drop_table("tags")
