"""persist generated images on messages"""
from alembic import op
import sqlalchemy as sa

revision="0004"
down_revision="0003"
branch_labels=None
depends_on=None

def upgrade():
    columns={x["name"] for x in sa.inspect(op.get_bind()).get_columns("messages")}
    if "image_path" not in columns:
        op.add_column("messages",sa.Column("image_path",sa.String(500),nullable=True))

def downgrade():
    op.drop_column("messages","image_path")
