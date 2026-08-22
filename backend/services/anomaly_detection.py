import logging
from typing import Dict, Any, List
import pandas as pd
from backend.ml.prediction import predict_anomaly_score

logger = logging.getLogger("riskshield.services.anomaly")


def evaluate_anomaly_signals(features_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Run Isolation Forest anomaly scoring and identify anomalous sub-dimensions.
    """
    score = predict_anomaly_score(features_df)
    row = features_df.iloc[0].to_dict()

    anomaly_flags = []
    
    # 1. Amount Anomaly
    if row.get("amount_zscore", 0.0) > 2.5:
        anomaly_flags.append({
            "dimension": "AMOUNT",
            "severity": "HIGH",
            "message": f"Transaction amount is {row.get('amount_zscore'):.1f}σ above customer normal spend"
        })

    # 2. Velocity Anomaly
    if row.get("transactions_last_10min", 1) >= 4:
        anomaly_flags.append({
            "dimension": "VELOCITY",
            "severity": "HIGH",
            "message": f"Abnormal burst: {int(row.get('transactions_last_10min'))} transactions in 10 minutes"
        })

    # 3. Location Anomaly
    if row.get("distance_from_previous_transaction", 0) > 300 or row.get("country_change", 0) > 0:
        anomaly_flags.append({
            "dimension": "LOCATION",
            "severity": "MEDIUM",
            "message": f"Geographic jump: {row.get('distance_from_previous_transaction', 0):,.0f} km from previous recorded location"
        })

    # 4. Device Anomaly
    if row.get("is_new_device", 0) > 0:
        anomaly_flags.append({
            "dimension": "DEVICE",
            "severity": "MEDIUM",
            "message": "Unrecognized device signature detected"
        })

    # 5. Temporal Anomaly
    if row.get("unusual_time", 0) > 0:
        anomaly_flags.append({
            "dimension": "TEMPORAL",
            "severity": "LOW",
            "message": "Activity detected during unusual off-peak hours (1:00 AM - 5:00 AM)"
        })

    return {
        "anomaly_score": round(score, 4),
        "is_anomalous": score > 0.60,
        "anomalies_detected": anomaly_flags,
        "anomaly_count": len(anomaly_flags)
    }
