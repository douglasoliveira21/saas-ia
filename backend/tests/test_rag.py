def test_chunking_preserves_locator_and_overlap():
    from app.rag import chunk_sections
    text = "Primeiro parágrafo com conteúdo empresarial. " * 80
    chunks = chunk_sections([("página 3", text)], target=400, overlap=80)
    assert len(chunks) > 2
    assert all(locator == "página 3" for locator, _ in chunks)
    assert all(len(content) >= 40 for _, content in chunks)


def test_cosine_similarity_orders_related_vectors():
    from app.rag import cosine_similarity, keyword_similarity
    assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0
    assert keyword_similarity("contrato ACME-42", "O contrato ACME-42 está vigente") == 1.0


def test_private_folder_permissions_are_enforced():
    from types import SimpleNamespace
    from app.rag import _allowed
    file = SimpleNamespace(user_id="owner")
    restricted = SimpleNamespace(shared=True, permissions={"user_ids": ["allowed"]})
    assert _allowed(file, restricted, None, "allowed", "member", None)
    assert not _allowed(file, restricted, None, "blocked", "member", None)
    assert _allowed(file, restricted, None, "admin-user", "admin", None)


def test_rag_sources_are_downloadable_and_deduplicated():
    from types import SimpleNamespace
    from app.main import ensure_rag_sources
    item = SimpleNamespace(id="file-1", name="manual.pdf")
    hits = [(SimpleNamespace(locator="página 2"), item, 0.9), (SimpleNamespace(locator="página 3"), item, 0.8)]
    answer = ensure_rag_sources("Resposta.", hits)
    assert "## Fontes internas" in answer
    assert answer.count("/api/v1/files/file-1/download") == 1


def test_default_rag_storage_does_not_require_server_pgvector():
    from sqlalchemy import JSON
    from app.config import settings
    from app.models import DocumentChunk
    assert settings.rag_pgvector_enabled is False
    assert isinstance(DocumentChunk.__table__.c.embedding.type, JSON)
