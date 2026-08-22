import pytest
from fastapi.testclient import TestClient
from backend.app.agent.investigator import ai_investigator
from backend.services.risk_engine import risk_engine


def test_ai_investigator_fallback_unit():
    tx = {
        "transaction_id": "TXN_ATO_UNIT",
        "customer_id": "CUST_999",
        "amount": 78000.0,
        "currency": "INR",
        "merchant_category": "ELECTRONICS",
        "device_id": "DEV_UNRECOGNIZED_12",
        "is_new_device": True,
        "transactions_last_10min": 7,
        "average_transaction_amount": 1200.0,
        "account_age_days": 10
    }
    risk_score = risk_engine.score_transaction(tx).model_dump()
    
    fallback_res = ai_investigator._generate_deterministic_fallback(
        tx=tx,
        risk_score=risk_score,
        shap_factors=risk_score.get("top_risk_factors", []),
        customer_profile={"customer_id": "CUST_999", "historical_average_amount": 1200.0}
    )

    assert fallback_res is not None
    assert fallback_res["recommended_action"] in ["HOLD", "ESCALATE", "REVIEW"]
    assert fallback_res["confidence"] > 0.50
    assert len(fallback_res["key_findings"]) > 0
    assert len(fallback_res["risk_summary"]) > 10


def test_ai_investigation_endpoint(client: TestClient):
    # First ingest a test transaction
    tx_payload = {
        "customer_id": "CUST_INV_01",
        "amount": 62000.0,
        "payment_method": "CREDIT_CARD",
        "merchant_category": "LUXURY",
        "is_new_device": True
    }
    create_res = client.post("/api/transactions", json=tx_payload)
    assert create_res.status_code == 201
    tid = create_res.json()["transaction"]["transaction_id"]

    # Run AI investigation on it
    inv_res = client.post(f"/api/investigations/{tid}")
    assert inv_res.status_code == 200
    inv_data = inv_res.json()
    assert inv_data["transaction_id"] == tid
    assert inv_data["recommended_action"] in ["HOLD", "REVIEW", "APPROVE", "ESCALATE"]
    assert len(inv_data["key_findings"]) > 0
