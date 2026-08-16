"""Add missing attachment columns for comments

Revision ID: 20260816_comments_attach_fix
Revises: 20260816_thumbnail_fix
Create Date: 2026-08-16
"""

from alembic import op
import sqlalchemy as sa


revision = "20260816_comments_attach_fix"
down_revision = "20260816_thumbnail_fix"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return column_name in [col["name"] for col in insp.get_columns(table_name)]


def upgrade():
    if not column_exists("comments", "attachment_url"):
        op.add_column("comments", sa.Column("attachment_url", sa.String(length=300), nullable=True))
    if not column_exists("comments", "attachment_name"):
        op.add_column("comments", sa.Column("attachment_name", sa.String(length=255), nullable=True))


def downgrade():
    if column_exists("comments", "attachment_name"):
        with op.batch_alter_table("comments") as batch_op:
            batch_op.drop_column("attachment_name")
    if column_exists("comments", "attachment_url"):
        with op.batch_alter_table("comments") as batch_op:
            batch_op.drop_column("attachment_url")
