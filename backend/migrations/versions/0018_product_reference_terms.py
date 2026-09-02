"""What a ticket's shorthand is called out in the world.

A Bodega Aurrera ticket prints ``GV DETE 7L``. A price survey indexes
``detergente``. Nothing in the first string implies the second: it is not a
normalisation, an abbreviation table or a regex away -- it is knowledge, and the
only honest place for knowledge is a row.

So the association is stored once per product, per user, and every later
question about that line uses it. ``source`` says who decided: ``auto`` when a
model proposed it, ``user`` once a person corrected it. That distinction is what
lets a proposal be improved without a human's answer ever being overwritten by
the next guess.

Per 0003, the table and its RLS policy ship as one reviewable change: a new
user-owned table cannot reach Supabase unprotected.

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-25
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: str | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "product_reference_terms",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        # The normalised identity from domain/services/products.py, the same key
        # the price book groups on -- so the association follows the product
        # across every ticket that ever printed it.
        sa.Column("product_key", sa.String(200), nullable=False),
        sa.Column("term", sa.String(80), nullable=False),
        sa.Column("source", sa.String(10), nullable=False, server_default="auto"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        # One term per product per user. A second association is a correction,
        # not a second opinion.
        sa.UniqueConstraint("user_id", "product_key", name="uq_reference_term_product"),
    )
    op.create_index(
        "ix_product_reference_terms_user_id", "product_reference_terms", ["user_id"]
    )

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.product_reference_terms ENABLE ROW LEVEL SECURITY;")
    op.execute(
        'DROP POLICY IF EXISTS "owner_all_product_reference_terms" '
        "ON public.product_reference_terms;"
    )
    op.execute(
        'CREATE POLICY "owner_all_product_reference_terms" ON public.product_reference_terms '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )


def downgrade() -> None:
    op.drop_index(
        "ix_product_reference_terms_user_id", table_name="product_reference_terms"
    )
    op.drop_table("product_reference_terms")
