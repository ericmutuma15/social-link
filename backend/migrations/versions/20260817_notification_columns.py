"""Backfill notification columns missing from legacy production databases.

Revision ID: 20260817_notification_columns
Revises: 20260817_merge_msg_story
Create Date: 2026-08-17
"""

from alembic import op
import sqlalchemy as sa


revision = '20260817_notification_columns'
down_revision = '20260817_merge_msg_story'
branch_labels = None
depends_on = None


def _columns():
    return {column['name'] for column in sa.inspect(op.get_bind()).get_columns('notification')}


def upgrade():
    columns = _columns()
    if 'post_id' not in columns:
        op.add_column('notification', sa.Column('post_id', sa.Integer(), sa.ForeignKey('posts.id'), nullable=True))
    if 'archived' not in columns:
        op.add_column('notification', sa.Column('archived', sa.Boolean(), nullable=False, server_default=sa.false()))
    if 'read' not in columns:
        op.add_column('notification', sa.Column('read', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade():
    columns = _columns()
    with op.batch_alter_table('notification') as batch:
        for column in ('archived', 'post_id'):
            if column in columns:
                batch.drop_column(column)
