"""user settings and trusted devices"""
from alembic import op
import sqlalchemy as sa

revision="0006"; down_revision="0005"; branch_labels=None; depends_on=None

def upgrade():
    bind=op.get_bind()
    user_columns={x["name"] for x in sa.inspect(bind).get_columns("users")}
    additions=[
        ("preferred_name",sa.String(120),True,None),("occupation",sa.String(80),True,None),("custom_instructions",sa.Text(),True,None),
        ("location_metadata_enabled",sa.Boolean(),False,sa.false()),("training_opt_in",sa.Boolean(),False,sa.false()),("memory_enabled",sa.Boolean(),False,sa.true()),
        ("location_lat",sa.Float(),True,None),("location_lng",sa.Float(),True,None),("location_timezone",sa.String(80),True,None),("token_version",sa.Integer(),False,"0"),
    ]
    for name,kind,nullable,default in additions:
        if name not in user_columns: op.add_column("users",sa.Column(name,kind,nullable=nullable,server_default=default))
    token_columns={x["name"] for x in sa.inspect(bind).get_columns("refresh_tokens")}
    for name,kind in [("device_name",sa.String(160)),("user_agent",sa.String(500)),("ip_address",sa.String(80)),("last_used_at",sa.DateTime(timezone=True)),("created_at",sa.DateTime(timezone=True))]:
        if name not in token_columns: op.add_column("refresh_tokens",sa.Column(name,kind,nullable=True))

def downgrade():
    for name in ["created_at","last_used_at","ip_address","user_agent","device_name"]: op.drop_column("refresh_tokens",name)
    for name in ["token_version","location_timezone","location_lng","location_lat","memory_enabled","training_opt_in","location_metadata_enabled","custom_instructions","occupation","preferred_name"]: op.drop_column("users",name)
