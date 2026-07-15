import enum, uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, Integer, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
def uid(): return str(uuid.uuid4())
def now(): return datetime.now(timezone.utc)
class Role(str, enum.Enum): owner="owner"; admin="admin"; member="member"; superadmin="superadmin"
class Company(Base):
    __tablename__="companies"
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid)
    name: Mapped[str]=mapped_column(String(160)); document: Mapped[str|None]=mapped_column(String(40),unique=True)
    email: Mapped[str]=mapped_column(String(255)); phone: Mapped[str|None]=mapped_column(String(30))
    plan: Mapped[str]=mapped_column(String(30),default="starter"); stripe_customer_id: Mapped[str|None]=mapped_column(String(100))
    stripe_subscription_id: Mapped[str|None]=mapped_column(String(100)); status: Mapped[str]=mapped_column(String(30),default="active")
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class User(Base):
    __tablename__="users"; __table_args__=(UniqueConstraint("company_id","email"),)
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str|None]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True)
    name: Mapped[str]=mapped_column(String(120)); email: Mapped[str]=mapped_column(String(255),index=True); password_hash: Mapped[str]=mapped_column(String(255))
    role: Mapped[str]=mapped_column(String(20),default=Role.member.value); avatar: Mapped[str|None]=mapped_column(String(500)); status: Mapped[str]=mapped_column(String(20),default="active")
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class RefreshToken(Base):
    __tablename__="refresh_tokens"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); user_id: Mapped[str]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True)
    token_hash: Mapped[str]=mapped_column(String(64),unique=True); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True)); revoked: Mapped[bool]=mapped_column(Boolean,default=False)
class Invitation(Base):
    __tablename__="invitations"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True)
    email: Mapped[str]=mapped_column(String(255)); role: Mapped[str]=mapped_column(String(20),default="member"); token: Mapped[str]=mapped_column(String(100),unique=True); accepted: Mapped[bool]=mapped_column(Boolean,default=False); expires_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
class Agent(Base):
    __tablename__="agents"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True)
    name: Mapped[str]=mapped_column(String(120)); description: Mapped[str]=mapped_column(Text,default=""); avatar: Mapped[str|None]=mapped_column(String(500)); ai_model: Mapped[str]=mapped_column(String(160)); system_prompt: Mapped[str]=mapped_column(Text); temperature: Mapped[float]=mapped_column(Float,default=.7); permissions: Mapped[dict]=mapped_column(JSON,default=dict); created_by: Mapped[str]=mapped_column(ForeignKey("users.id")); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Folder(Base):
    __tablename__="folders"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True); name: Mapped[str]=mapped_column(String(120)); created_by: Mapped[str]=mapped_column(ForeignKey("users.id")); shared: Mapped[bool]=mapped_column(Boolean,default=False); permissions: Mapped[dict]=mapped_column(JSON,default=dict)
class Conversation(Base):
    __tablename__="conversations"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id"),index=True); agent_id: Mapped[str|None]=mapped_column(ForeignKey("agents.id",ondelete="SET NULL")); folder_id: Mapped[str|None]=mapped_column(ForeignKey("folders.id",ondelete="SET NULL")); title: Mapped[str]=mapped_column(String(200),default="Nova conversa"); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class Message(Base):
    __tablename__="messages"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); conversation_id: Mapped[str]=mapped_column(ForeignKey("conversations.id",ondelete="CASCADE"),index=True); role: Mapped[str]=mapped_column(String(20)); content: Mapped[str]=mapped_column(Text); tokens: Mapped[int]=mapped_column(Integer,default=0); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class File(Base):
    __tablename__="files"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id")); folder_id: Mapped[str|None]=mapped_column(ForeignKey("folders.id",ondelete="SET NULL")); name: Mapped[str]=mapped_column(String(255)); path: Mapped[str]=mapped_column(String(500)); mime_type: Mapped[str]=mapped_column(String(100)); size: Mapped[int]=mapped_column(Integer); extracted_text: Mapped[str|None]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now)
class AgentFile(Base):
    __tablename__="agent_files"; agent_id: Mapped[str]=mapped_column(ForeignKey("agents.id",ondelete="CASCADE"),primary_key=True); file_id: Mapped[str]=mapped_column(ForeignKey("files.id",ondelete="CASCADE"),primary_key=True)
class UsageLog(Base):
    __tablename__="usage_logs"; id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id"),index=True); model: Mapped[str]=mapped_column(String(160)); input_tokens: Mapped[int]=mapped_column(Integer,default=0); output_tokens: Mapped[int]=mapped_column(Integer,default=0); cost: Mapped[float]=mapped_column(Float,default=0); audio_minutes: Mapped[float]=mapped_column(Float,default=0); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,index=True)
class UserMemory(Base):
    __tablename__="user_memories"
    id: Mapped[str]=mapped_column(String(36),primary_key=True,default=uid); company_id: Mapped[str]=mapped_column(ForeignKey("companies.id",ondelete="CASCADE"),index=True); user_id: Mapped[str]=mapped_column(ForeignKey("users.id",ondelete="CASCADE"),index=True)
    value: Mapped[str]=mapped_column(Text); source: Mapped[str]=mapped_column(String(30),default="conversation"); created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True),default=now,index=True)
