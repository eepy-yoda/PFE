"""Add reset_password_token and reset_token_expires to users table

Revision ID: 002
Revises: 001
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Check if columns already exist before adding (idempotent migration)
    if bind.dialect.name == 'postgresql':
        op.execute("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR UNIQUE,
            ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE
        """)
        op.execute("""
            CREATE INDEX IF NOT EXISTS ix_users_reset_password_token
            ON users (reset_password_token)
        """)
    else:
        # SQLite fallback (best-effort; SQLite has no IF NOT EXISTS for columns)
        try:
            op.add_column('users', sa.Column('reset_password_token', sa.String(), nullable=True))
        except Exception:
            pass
        try:
            op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(timezone=True), nullable=True))
        except Exception:
            pass


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("DROP INDEX IF EXISTS ix_users_reset_password_token")
        op.execute("ALTER TABLE users DROP COLUMN IF EXISTS reset_password_token")
        op.execute("ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires")
    else:
        op.drop_column('users', 'reset_token_expires')
        op.drop_column('users', 'reset_password_token')
