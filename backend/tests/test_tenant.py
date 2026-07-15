def test_health_contract():
    from app.main import health
    assert health()["status"] == "ok"

