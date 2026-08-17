"""Persist per-user conversation preferences.

Revision ID: 20260817_conversation_prefs
Revises: 20260817_story_interactions
"""

from alembic import op
import sqlalchemy as sa

revision = '20260817_conversation_prefs'
down_revision = '20260817_story_interactions'
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if 'conversation_preferences' in inspector.get_table_names():
        return
    op.create_table(
        'conversation_preferences',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pinned', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('favourite', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('user_id', 'partner_id', name='unique_conversation_preference'),
    )
    op.create_index('ix_conversation_preferences_user_id', 'conversation_preferences', ['user_id'])
    op.create_index('ix_conversation_preferences_partner_id', 'conversation_preferences', ['partner_id'])


def downgrade():
    op.drop_index('ix_conversation_preferences_partner_id', table_name='conversation_preferences')
    op.drop_index('ix_conversation_preferences_user_id', table_name='conversation_preferences')
    op.drop_table('conversation_preferences')
