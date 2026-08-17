"""Merge the comments and story/conversation migration branches.

Revision ID: 20260817_merge_msg_story
Revises: 20260816_comments_attach_fix, 20260817_conversation_prefs
Create Date: 2026-08-17
"""


revision = '20260817_merge_msg_story'
down_revision = ('20260816_comments_attach_fix', '20260817_conversation_prefs')
branch_labels = None
depends_on = None


def upgrade():
    # This is a graph-only merge. Both parent branches have already applied
    # their independent schema changes.
    pass


def downgrade():
    pass
