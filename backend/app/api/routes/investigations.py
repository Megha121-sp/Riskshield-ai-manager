import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status

from backend.app.db.mongodb import db_manager, clean_mongo_doc
from backend.app.models.schemas import Investigation, UserResponse
from backend.app.agent.investigator import ai_investigator
from backend.services.risk_engine import risk_engine
from backend.app.audit.logger import log_audit_event
from backend.app.api.routes.auth import get_current_user

logger = logging.getLogger("riskshield.api.investigations")
router = APIRouter(prefix="/investigations", tags=["AI Investigations"])


@router.post("/{transaction_id}", response_model=Investigation)
async def run_investigation(
    transaction_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Execute AI-powered deep risk investigation for a transaction.
    Gathers transaction parameters, SHAP factors, customer profile, and network links.
    Saves the investigation and logs to the immutable audit trail.
    """
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")
    inv_coll = db_manager.get_collection("investigations")

    tx = await tx_coll.find_one({"transaction_id": transaction_id})
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found"
        )

    # Risk score & SHAP
    risk_score = await risk_coll.find_one({"transaction_id": transaction_id})
    if not risk_score:
        sc_obj = risk_engine.score_transaction(tx)
        risk_score = sc_obj.model_dump()
        await risk_coll.insert_one(dict(risk_score))

    shap_factors = risk_score.get("top_risk_factors", [])

    # Find related transactions
    cid = tx.get("customer_id")
    dev = tx.get("device_id")
    ip = tx.get("ip_address")
    related = await tx_coll.find({
        "$or": [{"customer_id": cid}, {"device_id": dev}, {"ip_address": ip}]
    }).to_list(length=15)
    related_tids = [r.get("transaction_id") for r in related if r.get("transaction_id") != transaction_id]
    related_devs = list(set(r.get("device_id") for r in related if r.get("device_id")))
    related_ips = list(set(r.get("ip_address") for r in related if r.get("ip_address")))

    # Run AI Investigator
    investigation = await ai_investigator.investigate(
        transaction=tx,
        risk_score=risk_score,
        shap_factors=shap_factors,
        customer_profile={
            "customer_id": cid,
            "historical_average_amount": tx.get("average_transaction_amount", 1500),
            "historical_transaction_count": tx.get("previous_transaction_count", 10),
            "account_age_days": tx.get("account_age_days", 60)
        },
        related_transactions=related_tids,
        related_devices=related_devs,
        related_ips=related_ips
    )

    # Persist or update investigation
    inv_dict = investigation.model_dump()
    await inv_coll.update_one(
        {"transaction_id": transaction_id},
        {"$set": dict(inv_dict)},
        upsert=True
    )

    # Audit Trail
    await log_audit_event(
        event_type="AI_INVESTIGATION_COMPLETED",
        actor=current_user.username,
        action=f"AI Agent analyzed {transaction_id}: Recommended {investigation.recommended_action} (Confidence {investigation.confidence * 100:.0f}%)",
        transaction_id=transaction_id,
        details={
            "investigation_id": investigation.investigation_id,
            "recommended_action": investigation.recommended_action,
            "confidence": investigation.confidence,
            "is_fallback": investigation.is_fallback
        }
    )

    return investigation


@router.get("/{transaction_id}", response_model=Investigation)
async def get_investigation_by_transaction(transaction_id: str):
    """Retrieve existing investigation report for a transaction."""
    inv_coll = db_manager.get_collection("investigations")
    inv = await inv_coll.find_one({"transaction_id": transaction_id})
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No investigation report found for transaction {transaction_id}"
        )
    return Investigation(**clean_mongo_doc(inv))


@router.get("", response_model=List[Investigation])
async def list_all_investigations(limit: int = 50):
    """List all completed investigations."""
    inv_coll = db_manager.get_collection("investigations")
    cursor = inv_coll.find().sort("created_at", -1).limit(limit)
    inv_list = await cursor.to_list(length=limit)
    return [Investigation(**clean_mongo_doc(i)) for i in inv_list]


@router.post("/feedback", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def record_analyst_feedback(payload: Dict[str, Any]):
    """
    Record analyst quality feedback on AI Agent recommendations for continuous offline evaluation.
    """
    feedback_coll = db_manager.get_collection("analyst_feedback")
    doc = {
        "transaction_id": payload.get("transaction_id"),
        "investigation_id": payload.get("investigation_id"),
        "ai_recommendation": payload.get("ai_recommendation"),
        "analyst_decision": payload.get("analyst_decision"),
        "feedback_rating": payload.get("feedback_rating", "CORRECT"),  # CORRECT, PARTIALLY_CORRECT, INCORRECT
        "notes": payload.get("notes", ""),
        "analyst_id": payload.get("analyst_id", "analyst@riskshield.ai"),
        "created_at": payload.get("timestamp")
    }
    await feedback_coll.insert_one(dict(doc))
    return {"status": "SUCCESS", "message": "Feedback recorded successfully."}

