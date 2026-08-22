import logging
from typing import Dict, Any, Tuple, List
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.services.feature_engineering import feature_pipeline
from backend.ml.prediction import predict_fraud_probability, predict_anomaly_score
from backend.ml.explainability import explain_transaction_shap
from backend.app.models.schemas import RiskScore, RiskFactor

logger = logging.getLogger("riskshield.services.risk_engine")


class RiskScoringEngine:
    def __init__(self):
        self.w_ml = settings.WEIGHT_ML_FRAUD_PROB
        self.w_anomaly = settings.WEIGHT_ANOMALY
        self.w_velocity = settings.WEIGHT_VELOCITY
        self.w_behavioural = settings.WEIGHT_BEHAVIOURAL
        self.w_device = settings.WEIGHT_DEVICE
        self.w_location = settings.WEIGHT_LOCATION

        self.th_low = settings.THRESHOLD_LOW_RISK
        self.th_high = settings.THRESHOLD_HIGH_RISK

    def calculate_sub_scores(self, features_df: pd.DataFrame) -> Dict[str, float]:
        """Compute individual dimension risk scores normalized between 0.0 and 100.0."""
        row = features_df.iloc[0].to_dict()

        # 1. Supervised Fraud Probability [0.0 - 1.0] -> [0 - 100]
        ml_prob = predict_fraud_probability(features_df)
        ml_score = round(ml_prob * 100.0, 2)

        # 2. Anomaly Score [0.0 - 1.0] -> [0 - 100]
        anomaly_prob = predict_anomaly_score(features_df)
        anomaly_score = round(anomaly_prob * 100.0, 2)

        # 3. Velocity Score [0 - 100]
        tx_10m = float(row.get("transactions_last_10min", 1.0))
        tx_5m = float(row.get("transactions_last_5min", 0.0))
        amt_1h = float(row.get("amount_last_1hour", row.get("amount", 0.0)))
        vel_raw = 0.0
        if tx_10m >= 8 or tx_5m >= 5:
            vel_raw = 95.0
        elif tx_10m >= 5:
            vel_raw = 75.0
        elif tx_10m >= 3:
            vel_raw = 45.0
        elif tx_10m >= 2:
            vel_raw = 20.0
        else:
            vel_raw = 5.0
        velocity_score = min(100.0, vel_raw)

        # 4. Behavioural Score [0 - 100]
        amt_z = float(row.get("amount_zscore", 0.0))
        spending_ratio = float(row.get("spending_pattern_deviation", 1.0))
        unusual_time = float(row.get("unusual_time", 0.0))
        prev_failed = float(row.get("previous_failed_transactions", 0.0))

        beh_raw = 0.0
        if amt_z > 5.0 or spending_ratio > 10.0:
            beh_raw += 65.0
        elif amt_z > 2.5 or spending_ratio > 4.0:
            beh_raw += 40.0
        elif amt_z > 1.0:
            beh_raw += 15.0

        if unusual_time > 0:
            beh_raw += 15.0
        if prev_failed >= 2:
            beh_raw += 20.0

        behavioural_score = min(100.0, max(0.0, beh_raw))

        # 5. Device Score [0 - 100]
        is_new_dev = float(row.get("is_new_device", 0.0))
        dev_accounts = float(row.get("accounts_using_device", 1.0))
        dev_raw = 5.0
        if dev_accounts >= 3:
            dev_raw = 95.0
        elif dev_accounts >= 2:
            dev_raw = 70.0
        elif is_new_dev > 0:
            dev_raw = 45.0
        device_score = min(100.0, dev_raw)

        # 6. Location Score [0 - 100]
        dist = float(row.get("distance_from_previous_transaction", 0.0))
        country_chg = float(row.get("country_change", 0.0))
        loc_raw = 5.0
        if country_chg > 0:
            loc_raw = 85.0
        elif dist > 1000:
            loc_raw = 75.0
        elif dist > 300:
            loc_raw = 45.0
        elif dist > 50:
            loc_raw = 20.0
        location_score = min(100.0, loc_raw)

        return {
            "fraud_probability": round(ml_prob, 4),
            "ml_score": ml_score,
            "anomaly_score": round(anomaly_prob, 4),
            "anomaly_score_100": anomaly_score,
            "velocity_score": round(velocity_score, 2),
            "behavioural_score": round(behavioural_score, 2),
            "device_score": round(device_score, 2),
            "location_score": round(location_score, 2)
        }

    def score_transaction(self, tx: Dict[str, Any], customer_profile: Dict[str, Any] = None) -> RiskScore:
        """
        Evaluate full risk profile for a transaction and produce an explainable 0-100 score.
        """
        features_df = feature_pipeline.transform_single(tx, customer_profile)
        sub_scores = self.calculate_sub_scores(features_df)

        # Weighted Composite Score
        weighted_score = (
            sub_scores["ml_score"] * self.w_ml +
            sub_scores["anomaly_score_100"] * self.w_anomaly +
            sub_scores["velocity_score"] * self.w_velocity +
            sub_scores["behavioural_score"] * self.w_behavioural +
            sub_scores["device_score"] * self.w_device +
            sub_scores["location_score"] * self.w_location
        )

        # Deterministic Policy Boosts (Hard Rules)
        row = features_df.iloc[0].to_dict()
        if row.get("is_new_device", 0) > 0 and row.get("amount_zscore", 0) > 4.0:
            weighted_score = max(weighted_score, 82.0)

        if row.get("transactions_last_10min", 1) >= 6:
            weighted_score = max(weighted_score, 78.0)

        if row.get("accounts_using_device", 1) >= 3:
            weighted_score = max(weighted_score, 85.0)

        if row.get("country_change", 0) > 0 and row.get("amount_zscore", 0) > 2.0:
            weighted_score = max(weighted_score, 80.0)

        final_score = int(round(np.clip(weighted_score, 0, 100)))

        # Risk Tier Classification
        if final_score <= self.th_low:
            risk_level = "LOW"
        elif final_score <= self.th_high:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        # Generate SHAP Explanations
        top_factors = explain_transaction_shap(features_df, top_k=5)

        return RiskScore(
            transaction_id=str(tx.get("transaction_id", "UNKNOWN")),
            fraud_probability=sub_scores["fraud_probability"],
            anomaly_score=sub_scores["anomaly_score"],
            behavioural_score=sub_scores["behavioural_score"],
            device_score=sub_scores["device_score"],
            velocity_score=sub_scores["velocity_score"],
            location_score=sub_scores["location_score"],
            final_risk_score=final_score,
            risk_level=risk_level,
            model_version="xgboost_v1.0",
            top_risk_factors=top_factors
        )


risk_engine = RiskScoringEngine()
