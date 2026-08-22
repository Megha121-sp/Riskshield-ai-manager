import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "service" in data


def test_transactions_crud_and_score(client: TestClient):
    payload = {
        "customer_id": "CUST_API_TEST",
        "amount": 3500.0,
        "payment_method": "UPI",
        "merchant_category": "GROCERY"
    }
    create_res = client.post("/api/transactions", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert "transaction" in created_data
    assert "risk_score" in created_data

    tid = created_data["transaction"]["transaction_id"]
    get_res = client.get(f"/api/transactions/{tid}")
    assert get_res.status_code == 200
    assert get_res.json()["transaction"]["transaction_id"] == tid


def test_analytics_and_model_endpoints(client: TestClient):
    res_overview = client.get("/api/analytics/overview")
    assert res_overview.status_code == 200
    assert "total_transactions" in res_overview.json()

    res_metrics = client.get("/api/model/metrics")
    assert res_metrics.status_code == 200
    assert "model_comparison" in res_metrics.json()
