"""two phase AI billing, versioned prices, password reset and admin audit"""
from alembic import op
import sqlalchemy as sa

revision="0011"
down_revision="0010"
branch_labels=None
depends_on=None

def upgrade():
    bind=op.get_bind()
    inspector=sa.inspect(bind)
    ledger_columns={column["name"] for column in inspector.get_columns("ai_usage_ledger")}
    if "reservation_id" not in ledger_columns:
        op.add_column("ai_usage_ledger",sa.Column("reservation_id",sa.String(36),nullable=True))
        op.create_index("ix_ai_usage_ledger_reservation_id","ai_usage_ledger",["reservation_id"])
    if "idempotency_key" not in ledger_columns:
        op.add_column("ai_usage_ledger",sa.Column("idempotency_key",sa.String(128),nullable=True))
        op.create_index("ix_ai_usage_ledger_idempotency_key","ai_usage_ledger",["idempotency_key"])
    op.create_table(
        "ai_usage_reservations",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("idempotency_key",sa.String(128),nullable=False,unique=True),
        sa.Column("company_id",sa.String(36),sa.ForeignKey("companies.id",ondelete="SET NULL")),sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="SET NULL")),sa.Column("anonymous_device_hash",sa.String(64)),
        sa.Column("provider",sa.String(40),nullable=False),sa.Column("model",sa.String(160),nullable=False),sa.Column("operation",sa.String(40),nullable=False),
        sa.Column("estimated_cost",sa.Float(),nullable=False),sa.Column("actual_cost",sa.Float()),sa.Column("reserved_credits",sa.Integer(),nullable=False),sa.Column("final_credits",sa.Integer(),nullable=False,server_default="0"),
        sa.Column("status",sa.String(50),nullable=False),sa.Column("provider_request_id",sa.String(160)),sa.Column("response_payload",sa.JSON()),sa.Column("error_code",sa.String(80)),
        sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False),sa.Column("finalized_at",sa.DateTime(timezone=True)),
    )
    for name,cols,unique in [
        ("ix_ai_usage_reservations_idempotency_key",["idempotency_key"],True),("ix_ai_usage_reservations_company_id",["company_id"],False),
        ("ix_ai_usage_reservations_user_id",["user_id"],False),("ix_ai_usage_reservations_anonymous_device_hash",["anonymous_device_hash"],False),
        ("ix_ai_usage_reservations_status",["status"],False),("ix_ai_usage_reservations_created_at",["created_at"],False),
    ]: op.create_index(name,"ai_usage_reservations",cols,unique=unique)
    op.create_table(
        "provider_prices",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("provider",sa.String(40),nullable=False),sa.Column("model",sa.String(160),nullable=False),sa.Column("operation",sa.String(40),nullable=False,server_default="text"),
        sa.Column("input_token_price",sa.Float(),nullable=False,server_default="0"),sa.Column("output_token_price",sa.Float(),nullable=False,server_default="0"),sa.Column("image_price",sa.Float(),nullable=False,server_default="0"),sa.Column("audio_minute_price",sa.Float(),nullable=False,server_default="0"),
        sa.Column("currency",sa.String(3),nullable=False,server_default="BRL"),sa.Column("valid_from",sa.DateTime(timezone=True),nullable=False),sa.Column("valid_until",sa.DateTime(timezone=True)),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),
    )
    op.create_index("ix_provider_prices_lookup","provider_prices",["provider","model","valid_from"]); op.create_index("ix_provider_prices_valid_from","provider_prices",["valid_from"])
    op.create_table(
        "password_reset_tokens",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("user_id",sa.String(36),sa.ForeignKey("users.id",ondelete="CASCADE"),nullable=False),sa.Column("token_hash",sa.String(64),nullable=False,unique=True),
        sa.Column("expires_at",sa.DateTime(timezone=True),nullable=False),sa.Column("used_at",sa.DateTime(timezone=True)),sa.Column("requested_ip",sa.String(80)),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),
    )
    op.create_index("ix_password_reset_tokens_user_id","password_reset_tokens",["user_id"]); op.create_index("ix_password_reset_tokens_token_hash","password_reset_tokens",["token_hash"],unique=True); op.create_index("ix_password_reset_tokens_expires_at","password_reset_tokens",["expires_at"])
    op.create_table(
        "admin_audit_log",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("actor_user_id",sa.String(36)),sa.Column("target_user_id",sa.String(36)),sa.Column("company_id",sa.String(36)),
        sa.Column("action",sa.String(80),nullable=False),sa.Column("details",sa.JSON(),nullable=False),sa.Column("ip_address",sa.String(80)),sa.Column("user_agent",sa.String(500)),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),
    )
    for name,cols in [("ix_admin_audit_actor_user_id",["actor_user_id"]),("ix_admin_audit_target_user_id",["target_user_id"]),("ix_admin_audit_company_id",["company_id"]),("ix_admin_audit_action",["action"]),("ix_admin_audit_created",["created_at"])]:
        op.create_index(name,"admin_audit_log",cols)
    if bind.dialect.name=="postgresql":
        op.execute("""CREATE FUNCTION prevent_admin_audit_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'admin_audit_log is append-only'; END; $$ LANGUAGE plpgsql""")
        op.execute("CREATE TRIGGER admin_audit_append_only BEFORE UPDATE OR DELETE ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_mutation()")

def downgrade():
    bind=op.get_bind()
    if bind.dialect.name=="postgresql":
        op.execute("DROP TRIGGER IF EXISTS admin_audit_append_only ON admin_audit_log"); op.execute("DROP FUNCTION IF EXISTS prevent_admin_audit_mutation()")
    op.drop_table("admin_audit_log"); op.drop_table("password_reset_tokens"); op.drop_table("provider_prices"); op.drop_table("ai_usage_reservations")
    op.drop_index("ix_ai_usage_ledger_idempotency_key",table_name="ai_usage_ledger"); op.drop_column("ai_usage_ledger","idempotency_key")
    op.drop_index("ix_ai_usage_ledger_reservation_id",table_name="ai_usage_ledger"); op.drop_column("ai_usage_ledger","reservation_id")
