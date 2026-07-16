"""initial multi-tenant schema"""
from alembic import op
from app.database import Base
from app import models  # noqa
from app.config import settings
revision="0001"; down_revision=None; branch_labels=None; depends_on=None
def upgrade():
    bind=op.get_bind()
    if bind.dialect.name=="postgresql" and settings.rag_pgvector_enabled: op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=bind)
def downgrade(): Base.metadata.drop_all(bind=op.get_bind())

