def test_health_contract():
    from app.main import health
    assert health()["status"] == "ok"


def test_web_sources_are_guaranteed_without_duplicating_existing_links():
    from app.main import ensure_web_sources
    results = [
        {"title": "Fonte A", "url": "https://example.com/a"},
        {"title": "Fonte B", "url": "https://example.com/b"},
    ]
    answer = "Resposta baseada na [Fonte A](https://example.com/a)."
    enriched = ensure_web_sources(answer, results)
    assert enriched.count("https://example.com/a") == 1
    assert "## Fontes consultadas" in enriched
    assert "[Fonte B](https://example.com/b)" in enriched

