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


def test_sports_results_must_match_both_teams():
    from app.main import filter_web_results
    results = [
        {"title": "Los Angeles Lakers x Los Angeles Clippers", "url": "https://example.com/la", "content": ""},
        {"title": "New Orleans Pelicans vs Cleveland Cavaliers", "url": "https://nba.com/game/nop-cle", "content": "Pelicans 66, Cavaliers 62"},
    ]
    filtered = filter_web_results("qual o placar do jogo pelicans x cavaliers", results, 2)
    assert [item["url"] for item in filtered] == ["https://nba.com/game/nop-cle"]


def test_general_web_results_must_match_the_question():
    from app.main import filter_web_results
    results = [
        {"title": "Receita de bolo", "url": "https://example.com/bolo", "content": "Chocolate"},
        {"title": "Cotação atual do dólar", "url": "https://example.com/dolar", "content": "Dólar comercial hoje"},
    ]
    filtered = filter_web_results("qual a cotação atual do dólar", results)
    assert [item["url"] for item in filtered] == ["https://example.com/dolar"]

