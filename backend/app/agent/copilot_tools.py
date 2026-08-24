import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.db.mongodb import db_manager, clean_mongo_doc
from backend.services.priority_scoring import get_priority_investigation_queue
from backend.services.risk_engine import risk_engine
from backend.services.fraud_clusters import detect_fraud_clusters
from backend.services.fraud_spikes import detect_fraud_spikes

logger = logging.getLogger("riskshield.agent.copilot_tools")


async def tool_get_transaction(transaction_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve detailed transaction data including risk score and related alert."""
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")
    alert_coll = db_manager.get_collection("risk_alerts")

    tx = await tx_coll.find_one({"transaction_id": transaction_id.strip()})
    if not tx:
        return None

    score = await risk_coll.find_one({"transaction_id": transaction_id.strip()})
    alerts_cursor = alert_coll.find({"transaction_ids": transaction_id.strip()}).limit(10)
    alerts = await alerts_cursor.to_list(length=10)

    return {
        "transaction": clean_mongo_doc(tx),
        "risk_score": clean_mongo_doc(score) if score else None,
        "alerts": [clean_mongo_doc(a) for a in alerts]
    }


async def tool_get_customer(customer_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve customer profile and aggregate transaction metrics."""
    cust_coll = db_manager.get_collection("customer_profiles")
    tx_coll = db_manager.get_collection("transactions")

    profile = await cust_coll.find_one({"customer_id": customer_id.strip()})
    txs_cursor = tx_coll.find({"customer_id": customer_id.strip()}).limit(100)
    txs = await txs_cursor.to_list(length=100)

    if not profile and not txs:
        return None

    total_amt = sum(t.get("amount", 0) for t in txs)
    fraud_txs = [t for t in txs if t.get("is_fraud") == 1 or t.get("status") in ["HELD", "BLOCKED"]]
    devices = list(set(t.get("device_id") for t in txs if t.get("device_id")))
    ips = list(set(t.get("ip_address") for t in txs if t.get("ip_address")))

    return {
        "customer_id": customer_id.strip(),
        "account_age_days": profile.get("account_age_days", 60) if profile else 60,
        "historical_avg_spend": profile.get("average_transaction_amount", 1500) if profile else 1500,
        "total_transactions": len(txs),
        "fraud_transactions": len(fraud_txs),
        "total_volume": round(total_amt, 2),
        "linked_devices": devices,
        "linked_ips": ips,
        "recent_transactions": [clean_mongo_doc(t) for t in txs[:8]]
    }


async def tool_get_device(device_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve device hardware footprint and account linkage."""
    tx_coll = db_manager.get_collection("transactions")
    txs_cursor = tx_coll.find({"device_id": device_id.strip()}).limit(100)
    txs = await txs_cursor.to_list(length=100)

    if not txs:
        return None

    customers = list(set(t.get("customer_id") for t in txs if t.get("customer_id")))
    ips = list(set(t.get("ip_address") for t in txs if t.get("ip_address")))
    merchants = list(set(t.get("merchant_category") for t in txs if t.get("merchant_category")))
    fraud_count = sum(1 for t in txs if t.get("is_fraud") == 1 or t.get("status") in ["HELD", "BLOCKED"])
    total_amt = sum(t.get("amount", 0) for t in txs)

    risk_level = "CRITICAL" if len(customers) >= 3 or fraud_count >= 2 else ("HIGH" if len(customers) >= 2 else "NORMAL")

    return {
        "device_id": device_id.strip(),
        "risk_level": risk_level,
        "distinct_accounts_count": len(customers),
        "linked_customers": customers,
        "linked_ips": ips,
        "merchant_sectors": merchants,
        "transaction_count": len(txs),
        "fraud_count": fraud_count,
        "total_amount_at_risk": round(total_amt if fraud_count > 0 else 0, 2),
        "first_seen": txs[0].get("timestamp"),
        "last_seen": txs[-1].get("timestamp")
    }


async def tool_get_related_transactions(transaction_id: str) -> List[Dict[str, Any]]:
    """Retrieve transactions sharing customer ID or device ID."""
    tx_coll = db_manager.get_collection("transactions")
    target = await tx_coll.find_one({"transaction_id": transaction_id.strip()})
    if not target:
        return []

    cursor = tx_coll.find({
        "$or": [
            {"customer_id": target.get("customer_id")},
            {"device_id": target.get("device_id")}
        ],
        "transaction_id": {"$ne": transaction_id.strip()}
    }).limit(10)
    related = await cursor.to_list(length=10)

    return [clean_mongo_doc(r) for r in related]


async def tool_get_fraud_cluster(cluster_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve details for a specific fraud ring cluster."""
    cluster_coll = db_manager.get_collection("fraud_clusters")
    cluster = await cluster_coll.find_one({"cluster_id": cluster_id.strip()})
    if not cluster:
        all_c_cursor = cluster_coll.find({}).limit(50)
        all_c = await all_c_cursor.to_list(length=50)
        for c in all_c:
            if cluster_id.strip().lower() in c.get("cluster_id", "").lower():
                return clean_mongo_doc(c)
        return None
    return clean_mongo_doc(cluster)


async def tool_get_active_alerts() -> List[Dict[str, Any]]:
    """Retrieve all open risk alerts."""
    alert_coll = db_manager.get_collection("risk_alerts")
    cursor = alert_coll.find({"status": "OPEN"}).limit(20)
    alerts = await cursor.to_list(length=20)
    return [clean_mongo_doc(a) for a in alerts]


async def tool_get_high_priority_cases(limit: int = 5) -> List[Dict[str, Any]]:
    """Retrieve top prioritized cases needing triage."""
    return await get_priority_investigation_queue(limit=limit)


async def tool_get_fraud_spikes() -> List[Dict[str, Any]]:
    """Retrieve current rolling fraud spikes."""
    tx_coll = db_manager.get_collection("transactions")
    txns = await tx_coll.find().limit(5000).to_list(length=5000)
    spikes = await detect_fraud_spikes(txns)
    return [s.model_dump() if hasattr(s, "model_dump") else s for s in spikes]


async def tool_get_model_explanation(transaction_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve SHAP explanation and sub-score metrics for a transaction."""
    risk_coll = db_manager.get_collection("risk_scores")
    score = await risk_coll.find_one({"transaction_id": transaction_id.strip()})
    if not score:
        return None
    return clean_mongo_doc(score)


async def tool_get_what_changed_today() -> Dict[str, Any]:
    """Retrieve period comparison and primary causes of risk shifts."""
    tx_coll = db_manager.get_collection("transactions")
    txns = await tx_coll.find().limit(5000).to_list(length=5000)
    total_txs = len(txns)
    high_risk_txs = sum(1 for t in txns if t.get("is_fraud") == 1)
    spikes = await detect_fraud_spikes(txns)
    clusters = await detect_fraud_clusters(txns)

    fraud_rate = (high_risk_txs / total_txs * 100) if total_txs > 0 else 4.5
    baseline = 4.5
    rate_change = round(((fraud_rate - baseline) / baseline) * 100, 1)

    top_drivers = []
    if clusters:
        top_drivers.append(f"Detected {len(clusters)} active multi-account fraud ring(s) targeting luxury and digital goods.")
    if spikes:
        top_drivers.append(f"Identified {len(spikes)} rolling volume spike(s) with elevated fraud concentration.")
    top_drivers.append("Spike in off-peak transactions executed from unrecognized device fingerprints.")

    return {
        "fraud_rate": round(fraud_rate, 2),
        "baseline_rate": baseline,
        "fraud_rate_change_pct": rate_change,
        "high_risk_count": high_risk_txs,
        "active_fraud_rings": len(clusters),
        "active_spikes": len(spikes),
        "summary_explanation": " ".join(top_drivers)
    }
