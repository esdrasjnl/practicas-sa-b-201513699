    import json
import pytest
from main import app

@pytest.fixture
def client():
    app.testing = True
    with app.test_client() as client:
        yield client


def test_home_endpoint(client):
    """Verifica que el endpoint raíz responda correctamente."""
    response = client.get('/')
    assert response.status_code == 200
    assert b"Aplicación en ejecución" in response.data


def test_logging_output(monkeypatch, capsys):
    """Simula una petición y comprueba que se emite un log JSON válido."""
    with app.test_client() as client:
        client.get('/')
    captured = capsys.readouterr()
    log_line = captured.out.strip()
    data = json.loads(log_line)
    assert "timestamp" in data
    assert "message" in data
    assert data["level"] == "INFO"
