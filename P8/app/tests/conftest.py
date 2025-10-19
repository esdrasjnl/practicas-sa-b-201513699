import pytest
from main import app

@pytest.fixture(scope="session")
def flask_client():
    app.testing = True
    with app.test_client() as client:
        yield client
