"""Initial complete multi-tenant schema migration.

Revision ID: 8c99ad4dba6a
Revises: None
Create Date: 2026-10-03 04:01:14
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.core.database import Base
import app.models.tenant  # noqa
import app.models.user  # noqa
import app.models.customer  # noqa
import app.models.conversation  # noqa
import app.models.document  # noqa
import app.models.ticket  # noqa
import app.models.analytics  # noqa
import app.models.audit_log  # noqa

# revision identifiers, used by Alembic.
revision: str = '8c99ad4dba6a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all initial application tables if they do not exist."""
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    """Drop all initial application tables."""
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
