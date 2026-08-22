import uuid
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from backend.app.models.schemas import FraudSpike, RiskAlert
from backend.app.db.mongodb import db_manager

logger = logging.getLogger("riskshield.services.spikes")


async def detect_fraud_spikes(
    transactions: List[Dict[str, Any]],
    baseline_fraud_rate: float = 0.045
) -> List[FraudSpike]:
    """
    Rolling window anomaly monitor that compares recent window fraud rate against
    the baseline to identify abnormal surges and fraud waves.
    """
    if not transactions:
        return []

    spikes: List[FraudSpike] = []

    # Windows to analyze
    now = datetime.now(timezone.utc)
    windows = [
        {"name": "Last 1 Hour", "delta": timedelta(hours=1), "min_txns": 5},
        {"name": "Last 6 Hours", "delta": timedelta(hours=6), "min_txns": 15},
        {"name": "Last 24 Hours", "delta": timedelta(hours=24), "min_txns": 30}
    ]

    for win in windows:
        cutoff = now - win["delta"]
        win_txns = []
        for tx in transactions:
            ts = tx.get("timestamp")
            if isinstance(ts, str):
                try:
                    ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except Exception:
                    continue
            elif isinstance(ts, datetime):
                ts_dt = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
            else:
                continue

            if ts_dt >= cutoff:
                win_txns.append(tx)

        total_vol = len(win_txns)
        if total_vol >= win["min_txns"]:
            fraud_txns = [t for t in win_txns if t.get("is_fraud") == 1 or t.get("final_risk_score", 0) > 70]
            fraud_count = len(fraud_txns)
            fraud_rate = fraud_count / total_vol if total_vol > 0 else 0.0
            amt_at_risk = sum(float(t.get("amount", 0)) for t in fraud_txns)

            # Check if rate is significantly higher than baseline (e.g. > 1.8x baseline)
            if fraud_rate >= (baseline_fraud_rate * 1.6) and fraud_count >= 3:
                severity = "CRITICAL" if fraud_rate >= 0.15 or amt_at_risk > 100000 else "HIGH"
                spike = FraudSpike(
                    spike_id=f"SPIKE_{uuid.uuid4().hex[:8].upper()}",
                    time_window=win["name"],
                    transaction_volume=total_vol,
                    fraud_count=fraud_count,
                    fraud_rate=round(fraud_rate, 4),
                    baseline_fraud_rate=round(baseline_fraud_rate, 4),
                    severity=severity,
                    amount_at_risk=round(amt_at_risk, 2),
                    created_at=now
                )
                spikes.append(spike)

    return spikes
