"""Photographed tickets: what was in the basket, not just what it cost.

A statement says ``SORIANA HIPER 4062  $141.60``. That is everything the bank
knows and it is not what a person wants to ask about — "¿por qué gasté más este
mes?" is answered by *lechelala vs leche lala*, not by a merchant name. These
two tables hold the other half: the ticket's own lines, read on the phone from
a photo the server never receives (docs/custody-plan.md G1/G2), attached to the
movement they explain.

- ``receipts``: one shopping trip. ``transaction_id`` is nullable because a
  photo can arrive before the statement that will explain it, and unique
  because a movement has one basket — a second photo of the same purchase is a
  correction, not a second basket.
- ``receipt_items``: the product lines. ``product_key`` is the normalised
  identity (``domain/services/products.py``) the price comparison groups on,
  stored rather than recomputed so improving the normaliser is a visible,
  backfillable event instead of every historical comparison quietly shifting.

Per 0003, the tables and their RLS policies ship as one reviewable change: a
new user-owned table cannot reach Supabase unprotected.

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-24
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: str | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.create_table(
        "receipts",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("transaction_id", UUIDStr, nullable=True),
        sa.Column("store", sa.String(160), nullable=True),
        sa.Column("purchased_at", sa.Date(), nullable=True),
        sa.Column("total", sa.Numeric(14, 2), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="MXN"),
        sa.Column("match_source", sa.String(10), nullable=False, server_default="auto"),
        sa.Column("content_sha256", sa.String(64), nullable=False),
        sa.Column("extractor", sa.String(40), nullable=False, server_default="unknown"),
        sa.Column("reader", sa.String(60), nullable=False, server_default="heuristic"),
        sa.Column("captured_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("transaction_id", name="uq_receipts_transaction"),
    )
    op.create_index("ix_receipts_user_id", "receipts", ["user_id"])
    op.create_index("ix_receipts_transaction_id", "receipts", ["transaction_id"])
    # Dedup on re-sending the same photo, scoped to its owner.
    op.create_index("ix_receipts_content_sha256", "receipts", ["content_sha256"])

    op.create_table(
        "receipt_items",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("receipt_id", UUIDStr, nullable=False),
        sa.Column("line_no", sa.Integer(), nullable=False),
        sa.Column("raw_text", sa.Text(), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("product_key", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("quantity", sa.Numeric(12, 3), nullable=True),
        sa.Column("unit_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("size", sa.Numeric(12, 4), nullable=True),
        sa.Column("size_unit", sa.String(4), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["receipt_id"], ["receipts.id"], ondelete="CASCADE"
        ),
    )
    op.create_index("ix_receipt_items_user_id", "receipt_items", ["user_id"])
    op.create_index("ix_receipt_items_receipt_id", "receipt_items", ["receipt_id"])
    # The price book's only query shape: "every line of mine for this product".
    op.create_index(
        "ix_receipt_items_user_product", "receipt_items", ["user_id", "product_key"]
    )

    if op.get_bind().dialect.name != "postgresql":
        return

    for table in ("receipts", "receipt_items"):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f'DROP POLICY IF EXISTS "owner_all_{table}" ON public.{table};')
        op.execute(
            f'CREATE POLICY "owner_all_{table}" ON public.{table} '
            "FOR ALL USING (auth.uid()::text = user_id) "
            "WITH CHECK (auth.uid()::text = user_id);"
        )


def downgrade() -> None:
    op.drop_index("ix_receipt_items_user_product", table_name="receipt_items")
    op.drop_index("ix_receipt_items_receipt_id", table_name="receipt_items")
    op.drop_index("ix_receipt_items_user_id", table_name="receipt_items")
    op.drop_table("receipt_items")
    op.drop_index("ix_receipts_content_sha256", table_name="receipts")
    op.drop_index("ix_receipts_transaction_id", table_name="receipts")
    op.drop_index("ix_receipts_user_id", table_name="receipts")
    op.drop_table("receipts")
