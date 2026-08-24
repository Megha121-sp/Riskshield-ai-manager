import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status

from backend.app.db.mongodb import db_manager, clean_mongo_doc

logger = logging.getLogger("riskshield.api.customers")
router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/{customer_id}", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def get_customer_profile(customer_id: str):
    """
    Retrieve deep customer profile, risk history, hardware devices, and timeline events.
    """
    cust_coll = db_manager.get_collection("customer_profiles")
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")

    profile = await cust_coll.find_one({"customer_id": customer_id.strip()})
    txs = await tx_coll.find({"customer_id": customer_id.strip()}, limit=100)

    if not profile and not txs:
        raise HTTPException(status_code=404, detail=f"Customer '{customer_id}' not found.")

    # Calculate aggregate metrics
    total_txs = len(txs)
    total_vol = sum(float(t.get("amount", 0)) for t in txs)
    fraud_txs = [t for t in txs if t.get("is_fraud") == 1 or t.get("status") in ["HELD", "BLOCKED"]]
    successful_txs = [t for t in txs if t.get("status") in ["SUCCESS", "APPROVED"]]

    avg_amt = (total_vol / total_txs) if total_txs > 0 else (profile.get("average_transaction_amount", 1500) if profile else 1500)
    max_amt = max([float(t.get("amount", 0)) for t in txs], default=0.0)

    devices = list(set(t.get("device_id") for t in txs if t.get("device_id")))
    ips = list(set(t.get("ip_address") for t in txs if t.get("ip_address")))
    countries = list(set(t.get("country", "IN") for t in txs))
    merchants = list(set(t.get("merchant_category") for t in txs if t.get("merchant_category")))

    # Current risk level
    latest_tx = txs[0] if txs else None
    latest_score = 15
    latest_risk_level = "LOW"
    if latest_tx:
        s_doc = await risk_coll.find_one({"transaction_id": latest_tx.get("transaction_id")})
        if s_doc:
            latest_score = s_doc.get("final_risk_score", 15)
            latest_risk_level = s_doc.get("risk_level", "LOW")

    # Build chronological customer timeline
    timeline = []
    # Sort chronological
    sorted_txs = sorted(txs, key=lambda x: x.get("timestamp", ""))
    seen_devs = set()
    seen_countries = set()

    for t in sorted_txs:
        ts = t.get("timestamp")
        dev = t.get("device_id")
        country = t.get("country", "IN")
        amt = float(t.get("amount", 0))
        is_fr = t.get("is_fraud") == 1 or t.get("status") in ["HELD", "BLOCKED"]

        # Check for device milestone
        if dev and dev not in seen_devs:
            if seen_devs:
                timeline.append({
                    "timestamp": ts,
                    "event_type": "NEW_DEVICE_DETECTED",
                    "title": f"New Device Signature ({dev})",
                    "severity": "MEDIUM",
                    "description": f"Customer authorized payment from unrecognized device {dev}."
                })
            seen_devs.add(dev)

        # Check for country milestone
        if country and country not in seen_countries:
            if seen_countries:
                timeline.append({
                    "timestamp": ts,
                    "event_type": "COUNTRY_CHANGE",
                    "title": f"Cross-Border Region Change ({country})",
                    "severity": "HIGH",
                    "description": f"Transaction originated from foreign location {country}."
                })
            seen_countries.add(country)

        # Transaction event
        timeline.append({
            "timestamp": ts,
            "event_type": "TRANSACTION_EXECUTED",
            "title": f"Payment of ₹{amt:,.2f} ({t.get('payment_method')})",
            "severity": "CRITICAL" if is_fr else "NORMAL",
            "description": f"Status: {t.get('status')} | Category: {t.get('merchant_category')}",
            "transaction_id": t.get("transaction_id")
        })

    # Reverse timeline for newest-first display
    timeline.reverse()

    return {
        "customer_id": customer_id.strip(),
        "account_age_days": profile.get("account_age_days", 60) if profile else 60,
        "current_risk_score": latest_score,
        "risk_level": latest_risk_level,
        "total_transactions": total_txs,
        "successful_transactions": len(successful_txs),
        "fraud_transactions": len(fraud_txs),
        "average_transaction": round(avg_amt, 2),
        "largest_transaction": round(max_amt, 2),
        "total_transaction_volume": round(total_vol, 2),
        "devices": devices,
        "ip_addresses": ips,
        "countries": countries,
        "merchants": merchants,
        "timeline": timeline[:25],
        "recent_transactions": [clean_mongo_doc(t) for t in txs[:10]]
    }
