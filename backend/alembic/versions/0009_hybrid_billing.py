"""hybrid credits and anonymous allowance"""
from alembic import op
import sqlalchemy as sa
revision="0009"; down_revision="0008"; branch_labels=None; depends_on=None
def upgrade():
    bind=op.get_bind(); company={x["name"] for x in sa.inspect(bind).get_columns("companies")}; usage={x["name"] for x in sa.inspect(bind).get_columns("usage_logs")}
    if "credit_balance" not in company: op.add_column("companies",sa.Column("credit_balance",sa.Integer(),nullable=False,server_default="100"))
    if "api_budget_used" not in company: op.add_column("companies",sa.Column("api_budget_used",sa.Float(),nullable=False,server_default="0"))
    if "credits" not in usage: op.add_column("usage_logs",sa.Column("credits",sa.Integer(),nullable=False,server_default="0"))
    if "anonymous_allowances" not in sa.inspect(bind).get_table_names():
        op.create_table("anonymous_allowances",sa.Column("id",sa.String(36),primary_key=True),sa.Column("device_hash",sa.String(64),nullable=False,unique=True),sa.Column("ip_hash",sa.String(64),nullable=False),sa.Column("credit_balance",sa.Integer(),nullable=False,server_default="100"),sa.Column("api_budget_used",sa.Float(),nullable=False,server_default="0"),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False)); op.create_index("ix_anonymous_allowances_device_hash","anonymous_allowances",["device_hash"],unique=True); op.create_index("ix_anonymous_allowances_ip_hash","anonymous_allowances",["ip_hash"])
    op.execute("UPDATE companies SET credit_balance = CASE WHEN plan='starter' THEN 700 WHEN plan='professional' THEN 1600 WHEN plan='enterprise' THEN 7000 ELSE 100 END")
def downgrade(): op.drop_table("anonymous_allowances"); op.drop_column("usage_logs","credits"); op.drop_column("companies","api_budget_used"); op.drop_column("companies","credit_balance")
