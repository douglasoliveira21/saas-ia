"""enterprise RAG with pgvector"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from app.config import settings

revision="0005"; down_revision="0004"; branch_labels=None; depends_on=None

def upgrade():
    bind=op.get_bind(); dialect=bind.dialect.name
    if dialect=="postgresql" and settings.rag_pgvector_enabled: op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    columns={column["name"] for column in sa.inspect(bind).get_columns("files")}
    if "index_status" not in columns: op.add_column("files",sa.Column("index_status",sa.String(30),nullable=False,server_default="pending"))
    if "index_error" not in columns: op.add_column("files",sa.Column("index_error",sa.Text(),nullable=True))
    if "indexed_at" not in columns: op.add_column("files",sa.Column("indexed_at",sa.DateTime(timezone=True),nullable=True))
    file_indexes={index["name"] for index in sa.inspect(bind).get_indexes("files")}
    if "ix_files_index_status" not in file_indexes: op.create_index("ix_files_index_status","files",["index_status"])
    tables=sa.inspect(bind).get_table_names(); embedding_type=Vector(1024) if dialect=="postgresql" and settings.rag_pgvector_enabled else sa.JSON()
    if "document_chunks" not in tables:
        op.create_table("document_chunks",sa.Column("id",sa.String(36),primary_key=True),sa.Column("company_id",sa.String(36),sa.ForeignKey("companies.id",ondelete="CASCADE"),nullable=False),sa.Column("file_id",sa.String(36),sa.ForeignKey("files.id",ondelete="CASCADE"),nullable=False),sa.Column("chunk_index",sa.Integer(),nullable=False),sa.Column("content",sa.Text(),nullable=False),sa.Column("locator",sa.String(255)),sa.Column("token_estimate",sa.Integer(),nullable=False,server_default="0"),sa.Column("embedding",embedding_type,nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint("file_id","chunk_index",name="uq_document_chunks_file_index"))
    chunk_indexes={index["name"] for index in sa.inspect(bind).get_indexes("document_chunks")}
    if "ix_document_chunks_company_id" not in chunk_indexes: op.create_index("ix_document_chunks_company_id","document_chunks",["company_id"])
    if "ix_document_chunks_file_id" not in chunk_indexes: op.create_index("ix_document_chunks_file_id","document_chunks",["file_id"])
    if "ix_document_chunks_company_file" not in chunk_indexes: op.create_index("ix_document_chunks_company_file","document_chunks",["company_id","file_id"])
    if dialect=="postgresql" and settings.rag_pgvector_enabled and "ix_document_chunks_embedding_hnsw" not in chunk_indexes: op.execute("CREATE INDEX ix_document_chunks_embedding_hnsw ON document_chunks USING hnsw (embedding vector_cosine_ops)")

def downgrade():
    op.drop_table("document_chunks"); op.drop_index("ix_files_index_status",table_name="files"); op.drop_column("files","indexed_at"); op.drop_column("files","index_error"); op.drop_column("files","index_status")
