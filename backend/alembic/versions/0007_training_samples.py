"""anonymized opt-in training samples"""
from alembic import op
import sqlalchemy as sa
revision="0007"; down_revision="0006"; branch_labels=None; depends_on=None
def upgrade():
    if "training_samples" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table("training_samples",sa.Column("id",sa.String(36),primary_key=True),sa.Column("company_id",sa.String(36),sa.ForeignKey("companies.id",ondelete="CASCADE"),nullable=False),sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("prompt",sa.Text(),nullable=False),sa.Column("response",sa.Text(),nullable=False),sa.Column("model",sa.String(160),nullable=False),sa.Column("category",sa.String(40),nullable=False,server_default="chat"),sa.Column("consented_at",sa.DateTime(timezone=True),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
        op.create_index("ix_training_samples_company_id","training_samples",["company_id"]); op.create_index("ix_training_samples_user_id","training_samples",["user_id"]); op.create_index("ix_training_samples_created_at","training_samples",["created_at"])
def downgrade(): op.drop_table("training_samples")
