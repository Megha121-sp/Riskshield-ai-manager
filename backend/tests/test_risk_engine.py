import pytest
from backend.services.risk_engine import risk_engine

def test_risk_scoring_low():
    tx = {
        "transaction_id": "TXN_LOW",
        "customer_id": "CUST_01",
        "amount": 900.0,
        "average_transaction_amount": 950.0,
        "is_new_device": False,
        "transactions_last_10min": 1,
        "account_age_days": 200
    }
    score_obj = risk_engine.score_transaction(tx)
    assert 0 <= score_obj.final_risk_score <= 100
    assert score_obj.risk_level == "LOW"

def test_risk_scoring_high():
    tx = {
        "transaction_id": "TXN_HIGH",
        "customer_id": "CUST_02",
        "amount": 92000.0,
        "average_transaction_amount": 1100.0,
        "is_new_device": True,
        "transactions_last_10min": 8,
        "account_age_days": 4
    }
    score_obj = risk_engine.score_transaction(tx)
    assert score_obj.final_risk_score >= 70
    assert score_obj.risk_level == "HIGH"
    assert len(score_obj.top_risk_factors) > 0
