import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from backend.ml.model_loader import model_store
from backend.services.feature_engineering import feature_pipeline, FEATURE_COLUMNS


def predict_fraud_probability(features_df: pd.DataFrame) -> float:
    """
    Predict supervised fraud probability using trained XGBoost model.
    Falls back to heuristic score if model is loading.
    """
    if not model_store.is_loaded:
        model_store.load_models()

    if model_store.risk_model is not None:
        try:
            X = features_df[FEATURE_COLUMNS]
            probs = model_store.risk_model.predict_proba(X)
            # Probability of class 1 (Fraud)
            return float(np.clip(probs[0, 1], 0.0, 1.0))
        except Exception as e:
            pass

    # Heuristic fallback if model unavailable
    amt_zscore = float(features_df.get("amount_zscore", [0.0])[0])
    is_new_dev = float(features_df.get("is_new_device", [0.0])[0])
    tx_10m = float(features_df.get("transactions_last_10min", [1.0])[0])
    prob = 0.03 + (0.35 if is_new_dev > 0 else 0) + (0.25 if amt_zscore > 3.0 else 0) + (0.20 if tx_10m > 4 else 0)
    return float(np.clip(prob, 0.0, 0.99))


def predict_anomaly_score(features_df: pd.DataFrame) -> float:
    """
    Predict normalized anomaly score [0.0, 1.0] using Isolation Forest.
    0.0 = completely standard transaction, 1.0 = extreme statistical outlier.
    """
    if not model_store.is_loaded:
        model_store.load_models()

    if model_store.anomaly_model is not None:
        try:
            X = features_df[FEATURE_COLUMNS]
            raw_scores = model_store.anomaly_model.score_samples(X)
            # IsolationForest score_samples: typical normal is -0.38 to -0.45, anomaly is < -0.55
            # Transform: map -0.35 (normal) -> 0.05, -0.70 (extreme anomaly) -> 0.95
            raw = float(raw_scores[0])
            normalized = ( -raw - 0.35 ) / 0.30
            return float(np.clip(normalized, 0.01, 0.99))
        except Exception:
            pass

    # Heuristic fallback
    spending_dev = float(features_df.get("spending_pattern_deviation", [1.0])[0])
    loc_dist = float(features_df.get("distance_from_previous_transaction", [0.0])[0])
    score = 0.05 + (0.4 if spending_dev > 5.0 else 0) + (0.3 if loc_dist > 500 else 0)
    return float(np.clip(score, 0.01, 0.99))
