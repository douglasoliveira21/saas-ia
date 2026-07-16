def test_health_contract():
    from app.main import health
    assert health()["status"] == "ok"


def test_image_provider_errors_explain_billing_and_prompt_failures():
    from app.main import image_b64_from_data_url, image_provider_error, trusted_bfl_url
    assert "saldo do provedor" in image_provider_error(402)[1]
    assert "reformular" in image_provider_error(400)[1]
    assert "temporariamente indisponível" in image_provider_error(500)[1]
    assert trusted_bfl_url("https://api.bfl.ai/v1/get_result?id=123")
    assert trusted_bfl_url("https://delivery.us.bfl.ai/image.jpg")
    assert not trusted_bfl_url("https://example.com/image.jpg")
    assert image_b64_from_data_url("data:image/png;base64,aW1hZ2U=")=="aW1hZ2U="


def test_meeting_analysis_detects_intent_and_groups_speakers():
    from app.main import format_diarized_transcript, is_meeting_analysis_request
    assert is_meeting_analysis_request("Analise os participantes e o tom de voz desta reunião")
    transcript=format_diarized_transcript([
        {"speaker_id":"speaker_0","start":0,"end":2,"text":"Bom dia."},
        {"speaker_id":"speaker_0","start":2,"end":4,"text":"Vamos começar."},
        {"speaker_id":"speaker_1","start":5,"end":7,"text":"Concordo."},
    ])
    assert "Falante 1 [00:00-00:04]: Bom dia. Vamos começar." in transcript
    assert "Falante 2 [00:05-00:07]: Concordo." in transcript


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


def test_spreadsheet_spec_accepts_json_code_fence():
    from app.main import spreadsheet_spec
    result = spreadsheet_spec('```json\n{"filename":"teste.xlsx","sheets":[{"name":"Dados","headers":["Item"],"rows":[["A"]]}]}\n```')
    assert result["filename"] == "teste.xlsx"


def test_requested_file_extension_supports_common_formats():
    from app.main import requested_file_extension
    assert requested_file_extension("crie um documento Word") == "docx"
    assert requested_file_extension("gere uma apresentação PowerPoint") == "pptx"
    assert requested_file_extension("salve como relatorio.pdf") == "pdf"
    assert requested_file_extension("crie um arquivo JSON") == "json"


def test_training_samples_remove_personal_and_secret_data():
    from app.main import anonymize_training_text
    raw = "Meu e-mail é pessoa@empresa.com, CPF 123.456.789-10 e API_KEY=segredo-super-secreto-123."
    cleaned = anonymize_training_text(raw)
    assert "pessoa@empresa.com" not in cleaned
    assert "123.456.789-10" not in cleaned
    assert "segredo-super-secreto-123" not in cleaned

