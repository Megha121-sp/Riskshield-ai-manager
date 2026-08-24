import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Query, status

from backend.app.db.mongodb import db_manager, clean_mongo_doc

logger = logging.getLogger("riskshield.api.search")
router = APIRouter(prefix="/search", tags=["Global Search"])


@router.get("", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def global_search(q: str = Query(..., min_length=2, description="Search query string")):
    """
    Perform a unified search across Transactions, Customers, Devices, Alerts, and Investigations.
    """
    query_str = q.strip()
    
    tx_coll = db_manager.get_collection("transactions")
    cust_coll = db_manager.get_collection("customer_profiles")
    alert_coll = db_manager.get_collection("risk_alerts")
    inv_coll = db_manager.get_collection("investigations")

    results: Dict[str, List[Any]] = {
        "transactions": [],
        "customers": [],
        "devices": [],
        "alerts": [],
        "investigations": []
    }

    # 1. Search Transactions
    cursor = tx_coll.find({
        "$or": [
            {"transaction_id": {"$regex": query_str, "$options": "i"}},
            {"customer_id": {"$regex": query_str, "$options": "i"}},
            {"device_id": {"$regex": query_str, "$options": "i"}},
            {"ip_address": {"$regex": query_str, "$options": "i"}},
            {"merchant_id": {"$regex": query_str, "$options": "i"}},
            {"merchant_category": {"$regex": query_str, "$options": "i"}}
        ]
    }).limit(8)
    tx_matches = await cursor.to_list(length=8)
    results["transactions"] = [clean_mongo_doc(t) for t in tx_matches]

    # 2. Search Customers
    c_cursor = cust_coll.find({
        "customer_id": {"$regex": query_str, "$options": "i"}
    }).limit(5)
    cust_matches = await c_cursor.to_list(length=5)
    
    cust_list = [clean_mongo_doc(c) for c in cust_matches]
    if not cust_list and results["transactions"]:
        seen_custs = set()
        for t in results["transactions"]:
            cid = t.get("customer_id")
            if cid and cid not in seen_custs:
                seen_custs.add(cid)
                cust_list.append({
                    "customer_id": cid,
                    "account_age_days": t.get("account_age_days", 60),
                    "average_transaction_amount": t.get("average_transaction_amount", 1500)
                })
    results["customers"] = cust_list[:5]

    # 3. Search Devices
    dev_cursor = tx_coll.find({
        "device_id": {"$regex": query_str, "$options": "i"}
    }).limit(20)
    device_matches = await dev_cursor.to_list(length=20)
    dev_map = {}
    for d in device_matches:
        dev_id = d.get("device_id")
        if dev_id:
            if dev_id not in dev_map:
                dev_map[dev_id] = {
                    "device_id": dev_id,
                    "accounts": set(),
                    "txn_count": 0,
                    "fraud_count": 0,
                    "total_amount": 0.0
                }
            dev_map[dev_id]["accounts"].add(d.get("customer_id"))
            dev_map[dev_id]["txn_count"] += 1
            if d.get("is_fraud") == 1 or d.get("status") in ["HELD", "BLOCKED"]:
                dev_map[dev_id]["fraud_count"] += 1
            dev_map[dev_id]["total_amount"] += float(d.get("amount", 0))

    dev_results = []
    for dev_id, info in dev_map.items():
        dev_results.append({
            "device_id": dev_id,
            "distinct_accounts_count": len(info["accounts"]),
            "transaction_count": info["txn_count"],
            "fraud_count": info["fraud_count"],
            "total_amount": round(info["total_amount"], 2),
            "risk_level": "CRITICAL" if len(info["accounts"]) >= 3 or info["fraud_count"] >= 2 else ("HIGH" if len(info["accounts"]) >= 2 else "NORMAL")
        })
    results["devices"] = dev_results[:5]

    # 4. Search Alerts
    al_cursor = alert_coll.find({
        "$or": [
            {"alert_id": {"$regex": query_str, "$options": "i"}},
            {"title": {"$regex": query_str, "$options": "i"}},
            {"description": {"$regex": query_str, "$options": "i"}},
            {"transaction_ids": {"$regex": query_str, "$options": "i"}}
        ]
    }).limit(5)
    alert_matches = await al_cursor.to_list(length=5)
    results["alerts"] = [clean_mongo_doc(a) for a in alert_matches]

    # 5. Search Investigations
    inv_cursor = inv_coll.find({
        "$or": [
            {"investigation_id": {"$regex": query_str, "$options": "i"}},
            {"transaction_id": {"$regex": query_str, "$options": "i"}},
            {"summary": {"$regex": query_str, "$options": "i"}},
            {"recommended_action": {"$regex": query_str, "$options": "i"}}
        ]
    }).limit(5)
    inv_matches = await inv_cursor.to_list(length=5)
    results["investigations"] = [clean_mongo_doc(i) for i in inv_matches]

    total_hits = sum(len(v) for v in results.values())
    return {
        "query": query_str,
        "total_hits": total_hits,
        "results": results
    }
