import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Depends, status

from backend.app.db.mongodb import db_manager, clean_mongo_doc
from backend.app.models.schemas import Transaction, TransactionCreate, RiskScore, RiskAlert
from backend.services.risk_engine import risk_engine
from backend.services.priority_scoring import get_priority_investigation_queue, get_highest_priority_case
from backend.app.audit.logger import log_audit_event

logger = logging.getLogger("riskshield.api.transactions")
router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/priority-queue", response_model=List[Dict[str, Any]])
async def get_priority_queue(limit: int = Query(5, ge=1, le=20)):
    """
    Fetch prioritized investigation queue ranked dynamically by risk severity,
    financial exposure, network connectivity, and urgency.
    """
    return await get_priority_investigation_queue(limit=limit)


@router.get("/highest-priority", response_model=Optional[Dict[str, Any]])
async def get_top_priority_case():
    """
    Retrieve the single highest-priority case for 1-click 'Investigate Now' action.
    """
    return await get_highest_priority_case()



@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_transaction(payload: TransactionCreate):
    """
    Ingest a new payment transaction, run feature engineering & risk engine,
    persist to database, record audit trail, and trigger alerts if high-risk.
    """
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")
    alert_coll = db_manager.get_collection("risk_alerts")

    tid = f"TXN_{uuid.uuid4().hex[:10].upper()}"
    now_dt = datetime.now(timezone.utc)

    dev_id = payload.device_id or f"DEV_{payload.customer_id}_0"
    ip_addr = payload.ip_address or "103.22.45.89"

    tx_dict = {
        "transaction_id": tid,
        "customer_id": payload.customer_id,
        "amount": round(payload.amount, 2),
        "currency": payload.currency,
        "timestamp": now_dt.isoformat(),
        "payment_method": payload.payment_method.upper(),
        "merchant_id": payload.merchant_id,
        "merchant_category": payload.merchant_category.upper(),
        "device_id": dev_id,
        "ip_address": ip_addr,
        "country": payload.country,
        "latitude": payload.latitude or 19.0760,
        "longitude": payload.longitude or 72.8777,
        "status": payload.status,
        "failure_reason": payload.failure_reason,
        "is_new_device": payload.is_new_device,
        "previous_transaction_count": payload.previous_transaction_count or 15,
        "average_transaction_amount": payload.average_transaction_amount or 1500.0,
        "transactions_last_10min": 1,
        "transactions_last_1hour": 1,
        "account_age_days": payload.account_age_days or 60,
        "is_fraud": 0,
        "created_at": now_dt
    }

    # 1. Run Risk Scoring Engine
    risk_score_obj = risk_engine.score_transaction(tx_dict)
    risk_dict = risk_score_obj.model_dump()

    # If risk is severe, tag internal fraud flag & update initial status
    if risk_score_obj.final_risk_score > 70:
        tx_dict["is_fraud"] = 1
        tx_dict["status"] = "HELD"
    elif risk_score_obj.final_risk_score > 30:
        tx_dict["status"] = "REVIEW"
    else:
        tx_dict["status"] = "APPROVED"

    # 2. Persist Transaction & Score
    await tx_coll.insert_one(dict(tx_dict))
    await risk_coll.insert_one(dict(risk_dict))

    # 3. Trigger Alert if High Risk
    if risk_score_obj.final_risk_score > 70:
        alert = RiskAlert(
            alert_id=f"ALT_{uuid.uuid4().hex[:8].upper()}",
            severity="CRITICAL" if risk_score_obj.final_risk_score >= 85 else "HIGH",
            alert_type="HIGH_RISK_TXN",
            title=f"High-Risk Transaction Flagged (Score: {risk_score_obj.final_risk_score})",
            description=f"Transaction {tid} by {payload.customer_id} for ₹{payload.amount:,.2f} triggered high fraud probability.",
            transaction_ids=[tid],
            status="OPEN",
            created_at=now_dt
        )
        await alert_coll.insert_one(alert.model_dump())

    # 4. Log Audit Event
    await log_audit_event(
        event_type="TRANSACTION_INGESTED",
        actor="SYSTEM_INGESTION_GATEWAY",
        action=f"Scored {tid} with Risk Score {risk_score_obj.final_risk_score}/100 ({risk_score_obj.risk_level})",
        transaction_id=tid,
        details={"risk_score": risk_score_obj.final_risk_score, "risk_level": risk_score_obj.risk_level, "amount": payload.amount}
    )

    return {
        "transaction": clean_mongo_doc(tx_dict),
        "risk_score": clean_mongo_doc(risk_dict)
    }


@router.get("", response_model=Dict[str, Any])
async def list_transactions(
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    payment_method: Optional[str] = None,
    merchant_category: Optional[str] = None,
    status: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = Query(25, ge=1, le=500),
    skip: int = Query(0, ge=0),
    sort_by: str = "timestamp",
    sort_order: str = "desc"
):
    """
    Retrieve paginated transactions with comprehensive search, multi-factor filtering,
    and attached live risk scores.
    """
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")

    query: Dict[str, Any] = {}

    if search:
        query["$or"] = [
            {"transaction_id": {"$regex": search, "$options": "i"}},
            {"customer_id": {"$regex": search, "$options": "i"}},
            {"merchant_id": {"$regex": search, "$options": "i"}},
            {"device_id": {"$regex": search, "$options": "i"}},
            {"ip_address": {"$regex": search, "$options": "i"}}
        ]

    if payment_method:
        query["payment_method"] = payment_method.upper()

    if merchant_category:
        query["merchant_category"] = merchant_category.upper()

    if status:
        query["status"] = status.upper()

    if min_amount is not None or max_amount is not None:
        query["amount"] = {}
        if min_amount is not None:
            query["amount"]["$gte"] = min_amount
        if max_amount is not None:
            query["amount"]["$lte"] = max_amount

    # Count total matching
    total = await tx_coll.count_documents(query)

    # Fetch batch
    cursor = tx_coll.find(query)
    direction = -1 if sort_order.lower() == "desc" else 1
    cursor.sort(sort_by, direction).skip(skip).limit(limit)
    tx_list = await cursor.to_list(length=limit)

    # Enrich with Risk Scores
    tids = [t.get("transaction_id") for t in tx_list]
    scores = await risk_coll.find({"transaction_id": {"$in": tids}}).to_list(length=len(tids) + 10)
    score_map = {s.get("transaction_id"): s for s in scores}

    enriched = []
    for t in tx_list:
        tid = t.get("transaction_id")
        sc = score_map.get(tid)
        if not sc:
            sc_obj = risk_engine.score_transaction(t)
            sc = sc_obj.model_dump()
            await risk_coll.insert_one(dict(sc))

        if risk_level and sc.get("risk_level", "").upper() != risk_level.upper():
            continue

        item = clean_mongo_doc(t)
        item["risk_score"] = sc.get("final_risk_score", 0)
        item["risk_level"] = sc.get("risk_level", "LOW")
        item["fraud_probability"] = sc.get("fraud_probability", 0.0)
        item["anomaly_score"] = sc.get("anomaly_score", 0.0)
        enriched.append(item)

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "transactions": enriched
    }


@router.get("/{transaction_id}", response_model=Dict[str, Any])
async def get_transaction_detail(transaction_id: str):
    """
    Get deep transaction view including risk score breakdown, customer historical context,
    related account transactions, and audit timeline.
    """
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")
    audit_coll = db_manager.get_collection("audit_logs")
    inv_coll = db_manager.get_collection("investigations")

    tx = await tx_coll.find_one({"transaction_id": transaction_id})
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Transaction {transaction_id} not found")

    risk_score = await risk_coll.find_one({"transaction_id": transaction_id})
    if not risk_score:
        sc_obj = risk_engine.score_transaction(tx)
        risk_score = sc_obj.model_dump()
        await risk_coll.insert_one(dict(risk_score))

    cid = tx.get("customer_id")
    dev = tx.get("device_id")
    related = await tx_coll.find({
        "$or": [
            {"customer_id": cid},
            {"device_id": dev}
        ]
    }).limit(10).to_list(length=10)

    logs = await audit_coll.find({"transaction_id": transaction_id}).sort("timestamp", -1).to_list(length=20)
    inv = await inv_coll.find_one({"transaction_id": transaction_id})

    return {
        "transaction": clean_mongo_doc(tx),
        "risk_score": clean_mongo_doc(risk_score),
        "related_transactions": [clean_mongo_doc(r) for r in related if r.get("transaction_id") != transaction_id],
        "audit_logs": [clean_mongo_doc(l) for l in logs],
        "investigation": clean_mongo_doc(inv)
    }
