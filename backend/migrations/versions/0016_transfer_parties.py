"""Own-account counterparties + who decided the transfer flag.

The wording heuristics in ``domain/services/flags.py`` can only read what a
description *says* ("pago tarjeta", "su abono"). But most real self-transfers
say nothing — they carry the user's own name ("Eduardo Enriquez
Transferencia") or generic SPEI wording, and only the user can vouch that the
counterparty is themselves. Two additions:

- ``user_transfer_parties``: names the user declared as their own. Ingest and
  the bulk mark-transfer pass flag any movement whose description carries a
  taught party. Per-user for the same reason as 0010/0011: someone else's
  namesake is *their* rent, not a transfer.

- ``transactions.transfer_source``: who decided ``is_transfer`` — "auto" (the
  heuristics, a taught party, the mirror pairing) or "user" (a per-row
  correction). Same contract as ``category_source``: every automatic pass
  skips rows a human answered, and without the column no future re-flagging
  migration (0008, 0012) could tell a correction from a guess.

User-owned table, so RLS ships in the same migration (dialect-guarded, same
shape as 0007/0010/0011).

Revision ID: 0016
Revises: 0015
Create Date: 2026-08-21
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: str | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    op.add_column(
        "transactions",
        sa.Column("transfer_source", sa.String(10), nullable=False, server_default="auto"),
    )

    op.create_table(
        "user_transfer_parties",
        sa.Column("id", UUIDStr, nullable=False),
        sa.Column("user_id", UUIDStr, nullable=False),
        sa.Column("party", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "party", name="uq_user_transfer_parties_user_party"),
    )
    op.create_index("ix_user_transfer_parties_user_id", "user_transfer_parties", ["user_id"])

    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.user_transfer_parties ENABLE ROW LEVEL SECURITY;")
    op.execute(
        'DROP POLICY IF EXISTS "owner_all_user_transfer_parties" '
        "ON public.user_transfer_parties;"
    )
    op.execute(
        'CREATE POLICY "owner_all_user_transfer_parties" ON public.user_transfer_parties '
        "FOR ALL USING (auth.uid()::text = user_id) "
        "WITH CHECK (auth.uid()::text = user_id);"
    )


def downgrade() -> None:
    op.drop_index("ix_user_transfer_parties_user_id", table_name="user_transfer_parties")
    op.drop_table("user_transfer_parties")
    op.drop_column("transactions", "transfer_source")
