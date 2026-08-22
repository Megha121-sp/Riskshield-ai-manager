import pytest
from fastapi.testclient import TestClient
from backend.app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token


def test_password_hashing():
    raw = "super_secret_analyst_pw_2026"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("wrong_password", hashed) is False


def test_jwt_token_flow():
    payload = {"sub": "analyst@riskshield.ai", "role": "ANALYST"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "analyst@riskshield.ai"
    assert decoded["role"] == "ANALYST"


def test_auth_login_endpoint(client: TestClient):
    login_payload = {
        "username": "analyst@riskshield.ai",
        "password": "analyst123"
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ANALYST"
