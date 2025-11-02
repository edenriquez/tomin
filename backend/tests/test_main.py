""
Tests for the main FastAPI application.
"""
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_read_root():
    ""Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "backend" in response.json()["message"]
