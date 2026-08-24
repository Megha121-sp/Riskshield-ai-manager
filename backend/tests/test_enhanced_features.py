import pytest
from fastapi.testclient import TestClient


def test_priority_queue_endpoint(client: TestClient):
    res = client.get("/api/transactions/priority-queue?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "priority_score" in data[0]
        assert "primary_reasons" in data[0]
        assert "recommended_action" in data[0]


def test_highest_priority_case_endpoint(client: TestClient):
    res = client.get("/api/transactions/highest-priority")
    assert res.status_code == 200
    data = res.json()
    if data is not None:
        assert "priority_score" in data


def test_copilot_chat_endpoint(client: TestClient):
    res = client.post("/api/copilot/chat", json={"message": "What should I investigate first?"})
    assert res.status_code == 200
    data = res.json()
    assert "answer" in data
    assert "tools_used" in data
    assert len(data["answer"]) > 0


def test_global_search_endpoint(client: TestClient):
    res = client.get("/api/search?q=TXN")
    assert res.status_code == 200
    data = res.json()
    assert "results" in data
    assert "transactions" in data["results"]


def test_risk_simulation_endpoint(client: TestClient):
    tx_payload = {
        "customer_id": "USR_TEST_101",
        "amount": 65000.0,
        "payment_method": "CREDIT_CARD",
        "merchant_category": "LUXURY",
        "device_id": "DEV_TEST_001",
        "is_new_device": True,
        "transactions_last_10min": 4
    }
    res = client.post("/api/risk/simulate", json={
        "transaction": tx_payload,
        "overrides": {"is_new_device": False, "amount": 2000.0, "transactions_last_10min": 1}
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_counterfactual"] is True
    assert "original" in data
    assert "simulated" in data
    assert data["simulated"]["risk_score"] < data["original"]["risk_score"]


def test_period_changes_and_scorecard(client: TestClient):
    res1 = client.get("/api/analytics/changes")
    assert res1.status_code == 200
    assert "why_risk_increased" in res1.json()

    res2 = client.get("/api/analytics/executive-scorecard")
    assert res2.status_code == 200
    assert "business_impact" in res2.json()


def test_system_health_and_notifications(client: TestClient):
    res1 = client.get("/api/system/health-details")
    assert res1.status_code == 200
    assert res1.json()["overall_status"] in ["HEALTHY", "DEGRADED"]

    res2 = client.get("/api/system/notifications")
    assert res2.status_code == 200
    assert isinstance(res2.json(), list)
