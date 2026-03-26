"""Add saved_answers column and interrupted brief status

Revision ID: 001
Revises:
Create Date: 2026-03-24
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add saved_answers column (nullable text — safe for SQLite and PostgreSQL)
    op.add_column('projects', sa.Column('saved_answers', sa.Text(), nullable=True))

    # Add 'interrupted' value to the briefstatus enum (PostgreSQL only;
    # SQLite stores enums as VARCHAR so no DDL change is needed there)
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TYPE briefstatus ADD VALUE IF NOT EXISTS 'interrupted' AFTER 'in_progress'")


def downgrade():
    op.drop_column('projects', 'saved_answers')
    # PostgreSQL enum values cannot be removed without recreating the type;
    # downgrade leaves 'interrupted' in place (harmless)
