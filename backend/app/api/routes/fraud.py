import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status

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


@router.get("/devices/{device_id}", response_model=Dict[str, Any])
async def get_device_detail(device_id: str):
    """
    Retrieve deep forensic investigation profile for a specific hardware device.
    """
    tx_coll = db_manager.get_collection("transactions")
    txns = await tx_coll.find({"device_id": device_id.strip()}).limit(500).to_list(length=500)

    if not txns:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found.")

    accounts = list(set(t.get("customer_id") for t in txns if t.get("customer_id")))
    ips = list(set(t.get("ip_address") for t in txns if t.get("ip_address")))
    merchants = list(set(t.get("merchant_category") for t in txns if t.get("merchant_category")))
    fraud_txs = [t for t in txns if t.get("is_fraud") == 1 or t.get("status") in ["HELD", "BLOCKED"]]
    total_amount = sum(float(t.get("amount", 0)) for t in txns)

    fraud_rate = (len(fraud_txs) / len(txns) * 100) if txns else 0.0
    risk_level = "CRITICAL" if len(accounts) >= 3 or len(fraud_txs) >= 2 else ("HIGH" if len(accounts) >= 2 else "NORMAL")

    return {
        "device_id": device_id.strip(),
        "risk_level": risk_level,
        "distinct_accounts_count": len(accounts),
        "accounts": accounts,
        "transaction_count": len(txns),
        "fraud_count": len(fraud_txs),
        "fraud_rate": round(fraud_rate, 2),
        "total_amount": round(total_amount, 2),
        "amount_at_risk": round(sum(float(t.get("amount", 0)) for t in fraud_txs), 2),
        "distinct_ips_count": len(ips),
        "linked_ips": ips,
        "merchant_sectors": merchants,
        "first_seen": txns[0].get("timestamp"),
        "last_seen": txns[-1].get("timestamp"),
        "recommended_action": "BLOCK_DEVICE" if risk_level == "CRITICAL" else ("STEP_UP_2FA" if risk_level == "HIGH" else "ALLOW"),
        "transactions": [clean_mongo_doc(t) for t in txns[:15]]
    }


@router.get("/network-graph", response_model=Dict[str, Any])
async def get_fraud_network_graph():
    """
    Generate an interactive 5-entity relational network graph (Customer -> Transaction -> Device -> IP -> Merchant).
    """
    tx_coll = db_manager.get_collection("transactions")
    # Fetch sample of high-risk + suspicious transactions
    txns = await tx_coll.find({
        "$or": [
            {"is_fraud": 1},
            {"status": {"$in": ["HELD", "BLOCKED", "REVIEW"]}},
            {"is_new_device": True}
        ]
    }).limit(40).to_list(length=40)

    nodes = {}
    edges = []

    def add_node(nid, label, ntype, risk="NORMAL", details=None):
        if nid not in nodes:
            nodes[nid] = {
                "id": nid,
                "label": label,
                "type": ntype,
                "risk_level": risk,
                "details": details or {}
            }

    for t in txns:
        tid = t.get("transaction_id")
        cid = t.get("customer_id")
        dev = t.get("device_id")
        ip = t.get("ip_address")
        merch = f"MERCH_{t.get('merchant_category', 'RETAIL')}"
        amt = float(t.get("amount", 0))
        is_fr = t.get("is_fraud") == 1 or t.get("status") in ["HELD", "BLOCKED"]
        tx_risk = "CRITICAL" if is_fr else ("HIGH" if t.get("status") == "REVIEW" else "LOW")

        # 1. Transaction Node
        add_node(tid, tid, "TRANSACTION", tx_risk, {"amount": amt, "status": t.get("status")})

        # 2. Customer Node
        if cid:
            add_node(cid, cid, "CUSTOMER", "HIGH" if is_fr else "NORMAL", {"customer_id": cid})
            edges.append({"source": cid, "target": tid, "label": "AUTHORIZED", "risk_level": tx_risk})

        # 3. Device Node
        if dev:
            dev_risk = "CRITICAL" if dev.startswith("DEV_SYNDICATE") or dev.startswith("DEV_CARDING") else ("HIGH" if is_fr else "NORMAL")
            add_node(dev, dev, "DEVICE", dev_risk, {"device_id": dev})
            edges.append({"source": tid, "target": dev, "label": "BOUND_TO", "risk_level": dev_risk})

        # 4. IP Node
        if ip:
            ip_risk = "HIGH" if ip.startswith("185.") or ip.startswith("194.") else "NORMAL"
            add_node(ip, ip, "IP", ip_risk, {"ip_address": ip})
            edges.append({"source": tid, "target": ip, "label": "ROUTED_VIA", "risk_level": ip_risk})

        # 5. Merchant Node
        if merch:
            add_node(merch, t.get('merchant_category', 'MERCHANT'), "MERCHANT", "NORMAL", {"merchant_category": t.get('merchant_category')})
            edges.append({"source": tid, "target": merch, "label": "PAID_TO", "risk_level": "NORMAL"})

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "node_counts": {
            "transactions": sum(1 for n in nodes.values() if n["type"] == "TRANSACTION"),
            "customers": sum(1 for n in nodes.values() if n["type"] == "CUSTOMER"),
            "devices": sum(1 for n in nodes.values() if n["type"] == "DEVICE"),
            "ips": sum(1 for n in nodes.values() if n["type"] == "IP"),
            "merchants": sum(1 for n in nodes.values() if n["type"] == "MERCHANT")
        }
    }

