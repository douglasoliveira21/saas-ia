"""add favorite conversations"""
from alembic import op
import sqlalchemy as sa
revision="0003"; down_revision="0002"; branch_labels=None; depends_on=None
def upgrade():
    columns={x["name"] for x in sa.inspect(op.get_bind()).get_columns("conversations")}
    if "favorite" not in columns: op.add_column("conversations",sa.Column("favorite",sa.Boolean(),nullable=False,server_default=sa.false()))
def downgrade(): op.drop_column("conversations","favorite")
