import pytest
from backend.services.feature_engineering import feature_pipeline
from backend.ml.prediction import predict_fraud_probability, predict_anomaly_score
from backend.ml.explainability import explain_transaction_shap

def test_model_predictions():
    # Normal transaction
    normal_tx = {
        "amount": 800.0,
        "average_transaction_amount": 850.0,
        "is_new_device": False,
        "transactions_last_10min": 1,
        "distance_from_previous_transaction": 2.0,
        "account_age_days": 180
    }
    df_normal = feature_pipeline.transform_single(normal_tx)
    prob_normal = predict_fraud_probability(df_normal)
    anomaly_normal = predict_anomaly_score(df_normal)

    assert 0.0 <= prob_normal <= 1.0
    assert 0.0 <= anomaly_normal <= 1.0
    assert prob_normal < 0.40

    # Suspicious fraud transaction
    fraud_tx = {
        "amount": 75000.0,
        "average_transaction_amount": 1200.0,
        "is_new_device": True,
        "transactions_last_10min": 8,
        "distance_from_previous_transaction": 4500.0,
        "account_age_days": 5
    }
    df_fraud = feature_pipeline.transform_single(fraud_tx)
    prob_fraud = predict_fraud_probability(df_fraud)

    assert prob_fraud > 0.60

def test_shap_explanations():
    tx = {
        "amount": 65000.0,
        "average_transaction_amount": 1500.0,
        "is_new_device": True,
        "transactions_last_10min": 6
    }
    df = feature_pipeline.transform_single(tx)
    factors = explain_transaction_shap(df, top_k=3)
    assert len(factors) > 0
    assert hasattr(factors[0], "feature")
    assert hasattr(factors[0], "impact")
    assert hasattr(factors[0], "description")
