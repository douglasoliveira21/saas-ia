"""Stripe idempotency and operational monitoring"""
from alembic import op
import sqlalchemy as sa

revision="0012"
down_revision="0011"
branch_labels=None
depends_on=None

def upgrade():
    op.create_table(
        "stripe_webhook_events",
        sa.Column("event_id",sa.String(255),primary_key=True),sa.Column("event_type",sa.String(100),nullable=False),sa.Column("event_created",sa.Integer(),nullable=False),sa.Column("stream",sa.String(40),nullable=False),
        sa.Column("company_id",sa.String(36)),sa.Column("payload_hash",sa.String(64),nullable=False),sa.Column("status",sa.String(30),nullable=False),sa.Column("error",sa.Text()),
        sa.Column("received_at",sa.DateTime(timezone=True),nullable=False),sa.Column("processed_at",sa.DateTime(timezone=True)),
    )
    for name,columns in [
        ("ix_stripe_webhook_events_event_type",["event_type"]),("ix_stripe_webhook_events_event_created",["event_created"]),("ix_stripe_webhook_events_stream",["stream"]),
        ("ix_stripe_webhook_events_company_id",["company_id"]),("ix_stripe_webhook_events_status",["status"]),("ix_stripe_webhook_events_received_at",["received_at"]),
    ]: op.create_index(name,"stripe_webhook_events",columns)
    op.create_table(
        "system_alerts",
        sa.Column("id",sa.String(36),primary_key=True),sa.Column("kind",sa.String(80),nullable=False),sa.Column("severity",sa.String(20),nullable=False),sa.Column("status",sa.String(20),nullable=False),
        sa.Column("message",sa.Text(),nullable=False),sa.Column("details",sa.JSON(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.Column("resolved_at",sa.DateTime(timezone=True)),
    )
    for name,columns in [
        ("ix_system_alerts_kind",["kind"]),("ix_system_alerts_severity",["severity"]),("ix_system_alerts_status",["status"]),("ix_system_alerts_created_at",["created_at"]),("ix_system_alerts_status_created",["status","created_at"]),
    ]: op.create_index(name,"system_alerts",columns)

def downgrade():
    op.drop_table("system_alerts")
    op.drop_table("stripe_webhook_events")
