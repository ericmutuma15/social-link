"""Add delivery, read, and per-user soft-delete state to messages.

Revision ID: 20260724_message_delivery_state
Revises:
Create Date: 2026-07-24
"""

from alembic import op
import sqlalchemy as sa


revision = "20260724_message_delivery_state"
# The legacy migration files are not present in this checkout and the existing
# SQLite database has no Alembic version marker.  Treat this as the baseline
# migration so it can add only the new message columns without recreating data.
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("messages") as batch:
        batch.add_column(sa.Column("delivered_at", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("read_at", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("deleted_by_sender", sa.Boolean(), nullable=False, server_default=sa.false()))
        batch.add_column(sa.Column("deleted_by_receiver", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("UPDATE messages SET delivered_at = timestamp WHERE delivered_at IS NULL")
    with op.batch_alter_table("messages") as batch:
        batch.alter_column("delivered_at", nullable=False)


def downgrade():
    with op.batch_alter_table("messages") as batch:
        batch.drop_column("deleted_by_receiver")
        batch.drop_column("deleted_by_sender")
        batch.drop_column("read_at")
        batch.drop_column("delivered_at")
