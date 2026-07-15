"""add social interaction tables and like timestamp

Revision ID: e2f4a1c9b700
Revises: d5e939b2cc00
"""
from alembic import op
import sqlalchemy as sa

revision = "e2f4a1c9b700"
down_revision = "d5e939b2cc00"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("likes") as batch_op:
        batch_op.add_column(sa.Column("timestamp", sa.DateTime(), nullable=True))
        batch_op.create_unique_constraint("unique_user_post_like", ["user_id", "post_id"])
    op.execute("UPDATE likes SET timestamp = CURRENT_TIMESTAMP WHERE timestamp IS NULL")
    with op.batch_alter_table("likes") as batch_op:
        batch_op.alter_column("timestamp", nullable=False)
    op.create_table("bookmarks", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id"), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.UniqueConstraint("user_id", "post_id", name="unique_user_post_bookmark"))
    op.create_table("communities", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(100), nullable=False, unique=True), sa.Column("slug", sa.String(120), nullable=False, unique=True), sa.Column("description", sa.String(500), nullable=False), sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False))
    op.create_table("community_members", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("community_id", sa.Integer(), sa.ForeignKey("communities.id"), nullable=False), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("role", sa.String(20), nullable=False), sa.Column("joined_at", sa.DateTime(), nullable=False), sa.UniqueConstraint("community_id", "user_id", name="unique_community_member"))
    op.create_table("stories", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False), sa.Column("content", sa.Text()), sa.Column("media_url", sa.String(300)), sa.Column("media_type", sa.String(20), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False), sa.Column("expires_at", sa.DateTime(), nullable=False))


def downgrade():
    op.drop_table("stories")
    op.drop_table("community_members")
    op.drop_table("communities")
    op.drop_table("bookmarks")
    with op.batch_alter_table("likes") as batch_op:
        batch_op.drop_constraint("unique_user_post_like", type_="unique")
        batch_op.drop_column("timestamp")
