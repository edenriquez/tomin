"""Enforce the sign convention: transactions.amount >= 0.

``amount`` is a non-negative magnitude; ``tx_type`` alone carries direction
(docs/redesign-plan.md §2). Enforced in three places -- the domain entity
raises, the parser returns ``(magnitude, sign_hint)``, and this CHECK is the
backstop for anything that reaches the table by another route.

Negative rows already in the table came from ``SatCfdiParser``, which never
called ``abs()``. In the cube's
``SUM(CASE WHEN tx_type='expense' THEN amount ...)`` each one *subtracted* from
total expense, so a mis-signed charge made the user look like they had spent
less. They are repaired by taking the magnitude rather than being deleted: the
row is a real money movement, only its representation was wrong, and its
``tx_type`` already says which way it points.

The repaired count is logged at WARNING so the size of the problem is on the
record rather than inferred later from a diff.

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-27
"""

from __future__ import annotations

import logging
from collections.abc import Sequence

from alembic import op
from sqlalchemy import text

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONSTRAINT_NAME = "ck_transactions_amount_non_negative"

logger = logging.getLogger("alembic.runtime.migration")


def upgrade() -> None:
    bind = op.get_bind()

    # Backfill first: adding the CHECK before repairing the data would abort
    # the migration on exactly the databases that need it most.
    affected = bind.execute(text("SELECT COUNT(*) FROM transactions WHERE amount < 0")).scalar()
    if affected:
        logger.warning(
            "Sign backfill: repairing %s transaction row(s) with a negative amount. "
            "Magnitude is preserved; direction was already carried by tx_type.",
            affected,
        )
        bind.execute(text("UPDATE transactions SET amount = -amount WHERE amount < 0"))
    else:
        logger.info("Sign backfill: no negative transaction amounts found.")

    # batch_alter_table: SQLite cannot ADD CONSTRAINT, so it rebuilds the table.
    with op.batch_alter_table("transactions") as batch:
        batch.create_check_constraint(CONSTRAINT_NAME, "amount >= 0")


def downgrade() -> None:
    # Irreversible by design for the data half: the original signs are gone,
    # and re-negating would guess. Only the constraint is dropped.
    with op.batch_alter_table("transactions") as batch:
        batch.drop_constraint(CONSTRAINT_NAME, type_="check")
