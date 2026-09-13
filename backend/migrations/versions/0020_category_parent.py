"""Categories can have one parent.

The taxonomy was flat: every movement sat on a root (Transporte, Comida).
Reclasificación needs a leaf — Gasolina under Transporte — without a second
table or a second id on the transaction. ``parent_id`` is nullable; existing
rows stay roots. The seed grows the children and moves matcher labels onto
them. Movements already filed on a parent stay there until someone refines.

Revision ID: 0020
Revises: 0019
Create Date: 2026-09-12
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: str | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UUIDStr = sa.String(36)


def upgrade() -> None:
    # batch_alter_table: SQLite cannot ADD a self-FK without a rebuild.
    # On PostgreSQL this degrades to a plain ALTER.
    with op.batch_alter_table("categories") as batch:
        batch.add_column(sa.Column("parent_id", UUIDStr, nullable=True))
        batch.create_foreign_key(
            "fk_categories_parent_id",
            "categories",
            ["parent_id"],
            ["id"],
        )
        batch.create_index("ix_categories_parent_id", ["parent_id"])


def downgrade() -> None:
    with op.batch_alter_table("categories") as batch:
        batch.drop_index("ix_categories_parent_id")
        batch.drop_constraint("fk_categories_parent_id", type_="foreignkey")
        batch.drop_column("parent_id")
