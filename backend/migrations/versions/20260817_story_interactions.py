"""Add story views, likes, and message/notification story context.

Revision ID: 20260817_story_interactions
Revises: 20260816_thumbnail_fix
Create Date: 2026-08-17
"""

from alembic import op
import sqlalchemy as sa


revision = '20260817_story_interactions'
down_revision = '20260816_thumbnail_fix'
branch_labels = None
depends_on = None


def _column_exists(table, column):
    return column in {item['name'] for item in sa.inspect(op.get_bind()).get_columns(table)}


def _table_exists(table):
    return table in sa.inspect(op.get_bind()).get_table_names()


def upgrade():
    if not _table_exists('story_views'):
        op.create_table(
            'story_views',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('story_id', sa.Integer(), sa.ForeignKey('stories.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('viewed_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('story_id', 'user_id', name='unique_story_view'),
        )
        op.create_index('ix_story_views_story_id', 'story_views', ['story_id'])
        op.create_index('ix_story_views_user_id', 'story_views', ['user_id'])
    if not _table_exists('story_likes'):
        op.create_table(
            'story_likes',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('story_id', sa.Integer(), sa.ForeignKey('stories.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.UniqueConstraint('story_id', 'user_id', name='unique_story_like'),
        )
        op.create_index('ix_story_likes_story_id', 'story_likes', ['story_id'])
        op.create_index('ix_story_likes_user_id', 'story_likes', ['user_id'])
    if not _column_exists('messages', 'story_id'):
        op.add_column('messages', sa.Column('story_id', sa.Integer(), sa.ForeignKey('stories.id', ondelete='SET NULL'), nullable=True))
        op.create_index('ix_messages_story_id', 'messages', ['story_id'])
    if not _column_exists('notification', 'story_id'):
        op.add_column('notification', sa.Column('story_id', sa.Integer(), sa.ForeignKey('stories.id', ondelete='SET NULL'), nullable=True))
        op.create_index('ix_notification_story_id', 'notification', ['story_id'])


def downgrade():
    for table, column, index in [('notification', 'story_id', 'ix_notification_story_id'), ('messages', 'story_id', 'ix_messages_story_id')]:
        if _column_exists(table, column):
            op.drop_index(index, table_name=table)
            with op.batch_alter_table(table) as batch:
                batch.drop_column(column)
    for table, indexes in [('story_likes', ['ix_story_likes_story_id', 'ix_story_likes_user_id']), ('story_views', ['ix_story_views_story_id', 'ix_story_views_user_id'])]:
        if _table_exists(table):
            for index in indexes:
                op.drop_index(index, table_name=table)
            op.drop_table(table)
