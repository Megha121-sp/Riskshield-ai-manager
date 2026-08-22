import pytest
from backend.services.feature_engineering import feature_pipeline, FEATURE_COLUMNS

def test_feature_extraction():
    tx = {
        "transaction_id": "TXN_TEST_1",
        "customer_id": "CUST_001",
        "amount": 5000.0,
        "payment_method": "UPI",
        "merchant_category": "ELECTRONICS",
        "timestamp": "2026-03-01T14:30:00Z",
        "is_new_device": True,
        "transactions_last_10min": 3,
        "latitude": 19.0760,
        "longitude": 72.8777
    }

    fdict = feature_pipeline.extract_features_from_dict(tx)
    assert "amount" in fdict
    assert fdict["amount"] == 5000.0
    assert fdict["is_new_device"] == 1.0
    assert fdict["transactions_last_10min"] == 3.0

    df = feature_pipeline.transform_single(tx)
    assert len(df) == 1
    assert list(df.columns) == FEATURE_COLUMNS
