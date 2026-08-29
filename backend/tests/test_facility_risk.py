import pytest
from fastapi.testclient import TestClient


def test_list_facilities(client: TestClient):
    res = client.get("/api/facilities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    names = [f["facility_name"] for f in data]
    assert "Education Loan" in names
    assert "Home Loan" in names
    assert "Personal Loan" in names
    assert "MSME Loan" in names


def test_get_facility_detail(client: TestClient):
    res = client.get("/api/facilities/Education%20Loan")
    assert res.status_code == 200
    data = res.json()
    assert data["facility_name"] == "Education Loan"
    assert data["risk_score"] == 42.0
    assert data["risk_level"] == "MODERATE"
    assert "risk_factors" in data
    assert len(data["risk_factors"]) >= 4
    assert any(f["factor_type"] == "RISK_INCREASING" for f in data["risk_factors"])
    assert any(f["factor_type"] == "RISK_REDUCING" for f in data["risk_factors"])
    assert "profile" in data
    assert "historical_trend" in data
    assert data["is_demo_data"] is True


def test_facility_scenario_simulator(client: TestClient):
    # Base Education loan is 42.0. With High default rate (+14) and High concentration (+8), score should increase.
    payload = {
        "facility_type": "Education Loan",
        "default_rate": "HIGH",
        "income_stability": "MEDIUM",
        "loan_tenure": "MEDIUM",
        "collateral_coverage": "MEDIUM",
        "portfolio_concentration": "HIGH"
    }
    res = client.post("/api/facilities/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["original_score"] == 42.0
    assert data["projected_score"] > 42.0
    assert data["score_delta"] > 0
    assert len(data["key_drivers"]) >= 2
    assert "disclaimer" in data


def test_facility_analyst_decision_and_audit(client: TestClient):
    # Submit decision
    payload = {
        "facility_id": "FAC_EDU_01",
        "facility_type": "Education Loan",
        "risk_score": 42.0,
        "decision": "APPROVE_FOR_CONSIDERATION",
        "notes": "Portfolio shows acceptable risk-adjusted returns with strong collateral coverage.",
        "analyst_id": "analyst@riskshield.ai"
    }
    res = client.post("/api/facilities/decision", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["decision"] == "APPROVE_FOR_CONSIDERATION"
    assert "event_id" in data

    # Verify audit log recorded
    audit_res = client.get("/api/audit-logs?limit=10")
    assert audit_res.status_code == 200
    logs = audit_res.json().get("logs", [])
    assert any(l["event_type"] == "ANALYST_FACILITY_DECISION_RECORDED" for l in logs)



def test_facility_overview_summary(client: TestClient):
    res = client.get("/api/facilities/overview-summary")
    assert res.status_code == 200
    data = res.json()
    assert "facility_risk_alerts" in data
    assert "high_risk_facilities" in data
    assert "average_facility_risk" in data
    assert data["is_demo_data"] is True


def test_facility_config_thresholds(client: TestClient):
    res = client.get("/api/facilities/config")
    assert res.status_code == 200
    data = res.json()
    assert "low_threshold" in data
    assert "alert_threshold" in data
