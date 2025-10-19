from main import app

def test_metrics_endpoint():
    """Verifica que /metrics esté disponible y contenga las métricas básicas."""
    with app.test_client() as client:
        response = client.get('/metrics')
        assert response.status_code == 200
        content = response.data.decode('utf-8')
        assert 'app_requests_total' in content
        assert '# HELP' in content
        assert '# TYPE' in content
