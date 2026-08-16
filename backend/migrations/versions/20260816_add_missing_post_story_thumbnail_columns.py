"""Add missing thumbnail_url columns for posts and stories

Revision ID: 20260816_thumbnail_fix
Revises: 176e04493698
Create Date: 2026-08-16
"""

from alembic import op
import sqlalchemy as sa


revision = "20260816_thumbnail_fix"
down_revision = "176e04493698"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return column_name in [col["name"] for col in insp.get_columns(table_name)]


def upgrade():
    for table_name, column_name in [("posts", "thumbnail_url"), ("stories", "thumbnail_url")]:
        if not column_exists(table_name, column_name):
            op.add_column(table_name, sa.Column(column_name, sa.String(length=300), nullable=True))


def downgrade():
    for table_name, column_name in [("posts", "thumbnail_url"), ("stories", "thumbnail_url")]:
        if column_exists(table_name, column_name):
            with op.batch_alter_table(table_name) as batch_op:
                batch_op.drop_column(column_name)
