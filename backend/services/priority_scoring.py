import logging
from typing import Dict, Any, List, Optional
import numpy as np

from backend.app.db.mongodb import db_manager, clean_mongo_doc

logger = logging.getLogger("riskshield.services.priority_scoring")


def calculate_case_priority(
    tx: Dict[str, Any],
    risk_score: Optional[Dict[str, Any]] = None,
    alerts: Optional[List[Dict[str, Any]]] = None,
    device_account_count: int = 1,
    is_in_cluster: bool = False
) -> Dict[str, Any]:
    """
    Calculate an actionable Priority Score (0-100) for a transaction investigation.
    Formula:
        Priority = 0.35 * RiskSeverity + 0.25 * FinancialImpact + 0.20 * NetworkRisk + 0.10 * AlertUrgency + 0.10 * Confidence
    """
    score_val = float(risk_score.get("final_risk_score", 50)) if risk_score else float(tx.get("risk_score", 50))
    amount = float(tx.get("amount", 0.0))
    fraud_prob = float(risk_score.get("fraud_probability", 0.5)) if risk_score else 0.5

    # 1. Risk Severity (0-100)
    risk_severity = score_val

    # 2. Financial Impact (0-100) - Log/Linear scale up to ₹1,50,000
    financial_impact = min(100.0, (amount / 150000.0) * 100.0)
    if amount > 50000:
        financial_impact = max(financial_impact, 65.0)

    # 3. Network Risk (0-100)
    network_risk = 20.0
    if is_in_cluster:
        network_risk = 90.0
    elif device_account_count >= 3:
        network_risk = 95.0
    elif device_account_count >= 2:
        network_risk = 75.0
    elif tx.get("is_new_device", False):
        network_risk = 50.0

    # 4. Alert Urgency (0-100)
    alert_urgency = 20.0
    if alerts:
        has_critical = any(a.get("severity") == "CRITICAL" for a in alerts)
        has_high = any(a.get("severity") == "HIGH" for a in alerts)
        if has_critical:
            alert_urgency = 100.0
        elif has_high:
            alert_urgency = 75.0
        else:
            alert_urgency = 50.0

    # 5. Confidence (0-100)
    confidence = min(100.0, max(40.0, fraud_prob * 100.0))

    # Weighted Priority
    raw_priority = (
        0.35 * risk_severity +
        0.25 * financial_impact +
        0.20 * network_risk +
        0.10 * alert_urgency +
        0.10 * confidence
    )

    priority_score = int(round(np.clip(raw_priority, 0, 100)))

    # Primary risk reason synthesis
    reasons = []
    if tx.get("is_new_device"):
        reasons.append("Unrecognized device signature")
    if device_account_count >= 2:
        reasons.append(f"Device shared across {device_account_count} accounts")
    if is_in_cluster:
        reasons.append("Connected to active fraud cluster")
    
    avg_amt = float(tx.get("average_transaction_amount", 1500.0)) or 1500.0
    if avg_amt > 0 and amount > avg_amt * 3.0:
        ratio = round(amount / avg_amt, 1)
        reasons.append(f"{ratio}x spending deviation vs historical average")
    elif amount >= 50000:
        reasons.append("High absolute transaction volume")

    if tx.get("transactions_last_10min", 1) >= 3:
        reasons.append(f"Velocity burst ({tx.get('transactions_last_10min')} txns in 10m)")

    if not reasons:
        reasons.append("Elevated statistical risk factors")

    # Recommended Action proposal
    if priority_score >= 80 or score_val >= 75:
        recommended_action = "HOLD"
    elif priority_score >= 60 or score_val >= 45:
        recommended_action = "REVIEW"
    else:
        recommended_action = "APPROVE"

    return {
        "priority_score": priority_score,
        "primary_reasons": reasons[:3],
        "device_risk": "HIGH" if device_account_count >= 2 or tx.get("is_new_device") else "NORMAL",
        "fraud_network_status": "CLUSTER_MEMBER" if is_in_cluster else ("MULTI_ACCOUNT" if device_account_count >= 2 else "ISOLATED"),
        "recommended_action": recommended_action,
        "investigation_status": tx.get("status", "PENDING")
    }


async def get_priority_investigation_queue(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch the top priority cases requiring analyst triage.
    """
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")
    alert_coll = db_manager.get_collection("risk_alerts")
    cluster_coll = db_manager.get_collection("fraud_clusters")

    # Fetch recent pending/held/review transactions or high risk transactions
    recent_txs = await tx_coll.find(
        {"status": {"$in": ["HELD", "REVIEW", "PENDING", "FAILED"]}}
    ).limit(50).to_list(length=50)
    if not recent_txs:
        recent_txs = await tx_coll.find({}).limit(50).to_list(length=50)

    # Pre-fetch clusters and alerts
    clusters = await cluster_coll.find({}).to_list(length=50)
    cluster_tx_ids = set()
    for c in clusters:
        cluster_tx_ids.update(c.get("affected_transactions", []))

    # Pre-fetch device counts
    device_counts: Dict[str, set] = {}
    all_txs_for_dev = await tx_coll.find({}).limit(500).to_list(length=500)
    for t in all_txs_for_dev:
        dev = t.get("device_id")
        cust = t.get("customer_id")
        if dev and cust:
            if dev not in device_counts:
                device_counts[dev] = set()
            device_counts[dev].add(cust)


    evaluated_cases = []
    for tx in recent_txs:
        tid = tx.get("transaction_id")
        risk_doc = await risk_coll.find_one({"transaction_id": tid})
        alerts = await alert_coll.find({"transaction_ids": tid}).to_list(length=10)


        dev_id = tx.get("device_id")
        dev_accounts = len(device_counts.get(dev_id, {tx.get("customer_id")}))
        is_cluster = tid in cluster_tx_ids

        p_info = calculate_case_priority(
            tx=tx,
            risk_score=risk_doc,
            alerts=alerts,
            device_account_count=dev_accounts,
            is_in_cluster=is_cluster
        )

        score_val = risk_doc.get("final_risk_score", 50) if risk_doc else 50
        risk_lvl = risk_doc.get("risk_level", "MEDIUM") if risk_doc else "MEDIUM"

        case_item = {
            "transaction_id": tid,
            "customer_id": tx.get("customer_id"),
            "amount": tx.get("amount"),
            "payment_method": tx.get("payment_method"),
            "merchant_category": tx.get("merchant_category"),
            "merchant_id": tx.get("merchant_id"),
            "timestamp": tx.get("timestamp"),
            "status": tx.get("status"),
            "risk_score": score_val,
            "risk_level": risk_lvl,
            "priority_score": p_info["priority_score"],
            "primary_reasons": p_info["primary_reasons"],
            "device_risk": p_info["device_risk"],
            "fraud_network_status": p_info["fraud_network_status"],
            "recommended_action": p_info["recommended_action"],
            "investigation_status": p_info["investigation_status"]
        }
        evaluated_cases.append(case_item)

    # Sort descending by priority score
    evaluated_cases.sort(key=lambda x: x["priority_score"], reverse=True)
    return evaluated_cases[:limit]


async def get_highest_priority_case() -> Optional[Dict[str, Any]]:
    """Get the #1 highest priority case for instant 'Investigate Now' action."""
    queue = await get_priority_investigation_queue(limit=1)
    if queue:
        return queue[0]
    return None
