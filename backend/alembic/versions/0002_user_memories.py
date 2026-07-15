"""add private user memories"""
from alembic import op
import sqlalchemy as sa
revision="0002"; down_revision="0001"; branch_labels=None; depends_on=None
def upgrade():
    if "user_memories" in sa.inspect(op.get_bind()).get_table_names(): return
    op.create_table("user_memories",sa.Column("id",sa.String(36),primary_key=True),sa.Column("company_id",sa.String(36),sa.ForeignKey("companies.id",ondelete="CASCADE"),nullable=False),sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("value",sa.Text(),nullable=False),sa.Column("source",sa.String(30),nullable=False,server_default="conversation"),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
    op.create_index("ix_user_memories_company_id","user_memories",["company_id"]); op.create_index("ix_user_memories_user_id","user_memories",["user_id"]); op.create_index("ix_user_memories_created_at","user_memories",["created_at"])
def downgrade(): op.drop_table("user_memories")
