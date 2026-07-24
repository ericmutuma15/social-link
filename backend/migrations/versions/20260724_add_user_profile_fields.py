"""Add user profile fields

Revision ID: 20260724_add_user_profile_fields
Revises: 10d81939d966
Create Date: 2026-07-24

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260724_add_user_profile_fields"
down_revision = "10d81939d966"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return column_name in [col["name"] for col in insp.get_columns(table_name)]


def upgrade():
    def add_column_if_missing(column):
        if not column_exists("users", column.name):
            op.add_column("users", column)

    add_column_if_missing(sa.Column("avatar", sa.String(length=255), nullable=True))
    add_column_if_missing(sa.Column("cover_photo", sa.String(length=255), nullable=True))
    add_column_if_missing(sa.Column("phone_number", sa.String(length=32), nullable=True))
    add_column_if_missing(sa.Column("website", sa.String(length=255), nullable=True))
    add_column_if_missing(sa.Column("occupation", sa.String(length=100), nullable=True))
    add_column_if_missing(sa.Column("company", sa.String(length=100), nullable=True))
    add_column_if_missing(sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"))
    add_column_if_missing(sa.Column("language", sa.String(length=10), nullable=False, server_default="en"))
    add_column_if_missing(sa.Column("theme_preference", sa.String(length=12), nullable=False, server_default="system"))

    default_json = sa.text("'{}'::jsonb") if op.get_bind().dialect.name == "postgresql" else sa.text("'{}'")
    add_column_if_missing(sa.Column("social_links", sa.JSON(), nullable=False, server_default=default_json))
    add_column_if_missing(sa.Column("settings", sa.JSON(), nullable=False, server_default=default_json))

    # Populate defaults for existing rows where appropriate
    op.execute("UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL")
    op.execute("UPDATE users SET language = 'en' WHERE language IS NULL")
    op.execute("UPDATE users SET theme_preference = 'system' WHERE theme_preference IS NULL")
    try:
        op.execute("UPDATE users SET social_links = '{}' WHERE social_links IS NULL")
        op.execute("UPDATE users SET settings = '{}' WHERE settings IS NULL")
    except Exception:
        pass


def downgrade():
    with op.batch_alter_table("users") as batch:
        batch.drop_column("settings")
        batch.drop_column("social_links")
        batch.drop_column("theme_preference")
        batch.drop_column("language")
        batch.drop_column("timezone")
        batch.drop_column("company")
        batch.drop_column("occupation")
        batch.drop_column("website")
        batch.drop_column("phone_number")
        batch.drop_column("cover_photo")
        batch.drop_column("avatar")
