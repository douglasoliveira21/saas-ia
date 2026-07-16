"""Microsoft 365 OAuth connections"""
from alembic import op
import sqlalchemy as sa
revision="0008"; down_revision="0007"; branch_labels=None; depends_on=None
def upgrade():
    if "microsoft_connections" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table("microsoft_connections",sa.Column("id",sa.String(36),primary_key=True),sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False,unique=True),sa.Column("tenant_id",sa.String(80)),sa.Column("microsoft_user_id",sa.String(120)),sa.Column("email",sa.String(255)),sa.Column("access_token_encrypted",sa.Text(),nullable=False),sa.Column("refresh_token_encrypted",sa.Text(),nullable=False),sa.Column("expires_at",sa.DateTime(timezone=True),nullable=False),sa.Column("scopes",sa.Text(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False)); op.create_index("ix_microsoft_connections_user_id","microsoft_connections",["user_id"],unique=True)
def downgrade(): op.drop_table("microsoft_connections")
