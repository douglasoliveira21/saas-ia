"""add immutable AI usage ledger and audio usage column"""
from alembic import op
import sqlalchemy as sa

revision="0010"
down_revision="0009"
branch_labels=None
depends_on=None

def upgrade():
    bind=op.get_bind()
    inspector=sa.inspect(bind)
    usage_columns={column["name"] for column in inspector.get_columns("usage_logs")}
    if "audio_minutes" not in usage_columns:
        op.add_column("usage_logs",sa.Column("audio_minutes",sa.Float(),nullable=False,server_default="0"))
    if "ai_usage_ledger" not in inspector.get_table_names():
        op.create_table(
            "ai_usage_ledger",
            sa.Column("id",sa.String(36),primary_key=True),
            sa.Column("company_id",sa.String(36),sa.ForeignKey("companies.id",ondelete="SET NULL"),nullable=True),
            sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL"),nullable=True),
            sa.Column("anonymous_device_hash",sa.String(64),nullable=True),
            sa.Column("provider",sa.String(40),nullable=False),
            sa.Column("model",sa.String(160),nullable=False),
            sa.Column("provider_request_id",sa.String(160),nullable=True),
            sa.Column("operation",sa.String(40),nullable=False),
            sa.Column("estimated_cost",sa.Float(),nullable=False),
            sa.Column("actual_cost",sa.Float(),nullable=True),
            sa.Column("reserved_credits",sa.Integer(),nullable=False),
            sa.Column("final_credits",sa.Integer(),nullable=False),
            sa.Column("status",sa.String(30),nullable=False),
            sa.Column("latency_ms",sa.Integer(),nullable=False),
            sa.Column("error_code",sa.String(80),nullable=True),
            sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),
        )
        op.create_index("ix_ai_usage_ledger_company_id","ai_usage_ledger",["company_id"])
        op.create_index("ix_ai_usage_ledger_user_id","ai_usage_ledger",["user_id"])
        op.create_index("ix_ai_usage_ledger_anonymous_device_hash","ai_usage_ledger",["anonymous_device_hash"])
        op.create_index("ix_ai_usage_ledger_provider_request_id","ai_usage_ledger",["provider_request_id"])
        op.create_index("ix_ai_usage_ledger_created_at","ai_usage_ledger",["created_at"])
        op.create_index("ix_ai_usage_ledger_company_created","ai_usage_ledger",["company_id","created_at"])
        if bind.dialect.name=="postgresql":
            op.execute("""
                CREATE FUNCTION prevent_ai_usage_ledger_mutation() RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'ai_usage_ledger is append-only';
                END;
                $$ LANGUAGE plpgsql
            """)
            op.execute("CREATE TRIGGER ai_usage_ledger_append_only BEFORE UPDATE OR DELETE ON ai_usage_ledger FOR EACH ROW EXECUTE FUNCTION prevent_ai_usage_ledger_mutation()")

def downgrade():
    bind=op.get_bind()
    if bind.dialect.name=="postgresql":
        op.execute("DROP TRIGGER IF EXISTS ai_usage_ledger_append_only ON ai_usage_ledger")
        op.execute("DROP FUNCTION IF EXISTS prevent_ai_usage_ledger_mutation()")
    op.drop_table("ai_usage_ledger")
    op.drop_column("usage_logs","audio_minutes")
