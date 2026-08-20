"""Workstation conversations — persisted chat threads under a saved lens.

A workstation invites several *analyses*: "why was May high?" and "how much
should I withdraw on Mondays?" are different investigations over the same set.
Before this, the chat lived in component state — a reload, a navigation, or
simply opening a second question lost the first. These two tables make each
thread durable and owned: conversations under a workstation, messages under a
conversation, both stamped with ``user_id`` so RLS scopes them without a join.

No foreign keys, matching ``workstations`` (0014): deletion cascades are the
application's job, visible in code (`delete_for_workstation`) rather than
hidden in DDL, and a stale row is at worst invisible, never someone else's.

``messages.position`` is the thread order. ``created_at`` has second
granularity and a question and its streamed answer land inside the same
second; time alone could render an answer above its question.

Per 0003, the tables and their RLS policies are one reviewable change: a new
user-owned table cannot reach Supabase unprotected.

Revision ID: 0015
Revises: 0014
Create Date: 2026-08-19
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: str | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workstation_conversations",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("workstation_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    # The picker reads "this lens's threads, most recently touched first".
    op.create_index(
        "ix_workstation_conversations_ws_updated",
        "workstation_conversations",
        ["workstation_id", "updated_at"],
    )

    op.create_table(
        "workstation_chat_messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("conversation_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("role", sa.String(length=12), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("position", sa.Integer(), nullable=False),
    )
    op.create_index(
        "ix_workstation_chat_messages_conv_position",
        "workstation_chat_messages",
        ["conversation_id", "position"],
    )

    if op.get_bind().dialect.name != "postgresql":
        return

    for table, policy in (
        ("workstation_conversations", "owner_all_workstation_conversations"),
        ("workstation_chat_messages", "owner_all_workstation_chat_messages"),
    ):
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f'DROP POLICY IF EXISTS "{policy}" ON public.{table};')
        op.execute(
            f'CREATE POLICY "{policy}" ON public.{table} '
            "FOR ALL USING (auth.uid()::text = user_id) "
            "WITH CHECK (auth.uid()::text = user_id);"
        )


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            'DROP POLICY IF EXISTS "owner_all_workstation_chat_messages" '
            "ON public.workstation_chat_messages;"
        )
        op.execute(
            'DROP POLICY IF EXISTS "owner_all_workstation_conversations" '
            "ON public.workstation_conversations;"
        )
    op.drop_index(
        "ix_workstation_chat_messages_conv_position",
        table_name="workstation_chat_messages",
    )
    op.drop_table("workstation_chat_messages")
    op.drop_index(
        "ix_workstation_conversations_ws_updated",
        table_name="workstation_conversations",
    )
    op.drop_table("workstation_conversations")
