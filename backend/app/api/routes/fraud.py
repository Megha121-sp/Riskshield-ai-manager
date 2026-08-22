import logging
from typing import List, Dict, Any
from fastapi import APIRouter

from backend.app.db.mongodb import db_manager
from backend.services.fraud_clusters import detect_fraud_clusters
from backend.services.fraud_spikes import detect_fraud_spikes
from backend.app.models.schemas import FraudCluster, FraudSpike

logger = logging.getLogger("riskshield.api.fraud")
router = APIRouter(prefix="/fraud", tags=["Fraud Intelligence"])


@router.get("/clusters", response_model=List[FraudCluster])
async def get_fraud_clusters():
    """Retrieve detected fraud rings, shared device networks, and proxy syndicates."""
    tx_coll = db_manager.get_collection("transactions")
    txns = await tx_coll.find().limit(5000).to_list(length=5000)
    clusters = await detect_fraud_clusters(txns)
    return clusters


@router.get("/spikes", response_model=List[FraudSpike])
async def get_fraud_spikes():
    """Retrieve rolling time-window fraud rate surges and abnormal transaction spikes."""
    tx_coll = db_manager.get_collection("transactions")
    txns = await tx_coll.find().limit(5000).to_list(length=5000)
    spikes = await detect_fraud_spikes(txns)
    return spikes


@router.get("/devices", response_model=List[Dict[str, Any]])
async def get_suspicious_devices():
    """Retrieve hardware devices associated with multiple customer accounts or high fraud scores."""
    tx_coll = db_manager.get_collection("transactions")
    txns = await tx_coll.find().limit(5000).to_list(length=5000)

    device_map: Dict[str, Dict[str, Any]] = {}
    for t in txns:
        dev = t.get("device_id")
        if not dev:
            continue
        if dev not in device_map:
            device_map[dev] = {
                "device_id": dev,
                "accounts": set(),
                "transaction_count": 0,
                "fraud_count": 0,
                "total_amount": 0.0,
                "ips": set(),
                "last_seen": t.get("timestamp")
            }
        device_map[dev]["accounts"].add(t.get("customer_id"))
        device_map[dev]["ips"].add(t.get("ip_address"))
        device_map[dev]["transaction_count"] += 1
        device_map[dev]["total_amount"] += float(t.get("amount", 0))
        if t.get("is_fraud") == 1:
            device_map[dev]["fraud_count"] += 1

    suspicious = []
    for dev, info in device_map.items():
        if len(info["accounts"]) >= 2 or info["fraud_count"] >= 2 or dev.startswith("DEV_SYNDICATE") or dev.startswith("DEV_CARDING") or dev.startswith("DEV_UNSEEN") or dev.startswith("DEV_HIJACKED"):
            suspicious.append({
                "device_id": dev,
                "distinct_accounts_count": len(info["accounts"]),
                "accounts": list(info["accounts"]),
                "transaction_count": info["transaction_count"],
                "fraud_count": info["fraud_count"],
                "total_amount": round(info["total_amount"], 2),
                "distinct_ips_count": len(info["ips"]),
                "ips": list(info["ips"]),
                "last_seen": info["last_seen"],
                "risk_level": "CRITICAL" if len(info["accounts"]) >= 3 or info["fraud_count"] >= 3 else "HIGH"
            })

    suspicious.sort(key=lambda x: (x["distinct_accounts_count"], x["fraud_count"]), reverse=True)
    return suspicious
