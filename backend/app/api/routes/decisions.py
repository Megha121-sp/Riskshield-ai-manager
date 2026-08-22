import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status

from backend.app.db.mongodb import db_manager
from backend.app.models.schemas import Decision, DecisionCreate, UserResponse
from backend.app.audit.logger import log_audit_event
from backend.app.api.routes.auth import get_current_user

logger = logging.getLogger("riskshield.api.decisions")
router = APIRouter(prefix="/decisions", tags=["Analyst Decisions"])


@router.post("", response_model=Decision, status_code=status.HTTP_201_CREATED)
async def submit_analyst_decision(
    payload: DecisionCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Record an explicit human-in-the-loop analyst decision on a transaction.
    Requires mandatory analyst reason. Updates transaction status and writes to immutable audit trail.
    """
    decision_action = payload.analyst_decision.upper()
    if decision_action not in ["APPROVE", "HOLD", "BLOCK", "ESCALATE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analyst decision action: {decision_action}. Must be APPROVE, HOLD, BLOCK, or ESCALATE."
        )

    if not payload.reason or len(payload.reason.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A substantive reason is required for every risk decision."
        )

    tx_coll = db_manager.get_collection("transactions")
    dec_coll = db_manager.get_collection("decisions")
    inv_coll = db_manager.get_collection("investigations")

    tx = await tx_coll.find_one({"transaction_id": payload.transaction_id})
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {payload.transaction_id} not found"
        )

    inv = await inv_coll.find_one({"transaction_id": payload.transaction_id})
    ai_rec = inv.get("recommended_action", "REVIEW") if inv else "REVIEW"

    # Map decision action to transaction status
    status_map = {
        "APPROVE": "APPROVED",
        "HOLD": "HELD",
        "BLOCK": "BLOCKED",
        "ESCALATE": "ESCALATED"
    }
    new_tx_status = status_map.get(decision_action, "REVIEW")

    # Update transaction status
    await tx_coll.update_one(
        {"transaction_id": payload.transaction_id},
        {"$set": {"status": new_tx_status}}
    )

    analyst_id = payload.analyst_id or current_user.username
    decision_obj = Decision(
        decision_id=f"DEC_{uuid.uuid4().hex[:10].upper()}",
        transaction_id=payload.transaction_id,
        ai_recommendation=ai_rec,
        analyst_decision=decision_action,
        analyst_id=analyst_id,
        reason=payload.reason.strip(),
        created_at=datetime.now(timezone.utc)
    )

    # Persist decision
    await dec_coll.insert_one(decision_obj.model_dump())

    # Log to audit trail
    await log_audit_event(
        event_type="HUMAN_DECISION_RECORDED",
        actor=analyst_id,
        action=f"Analyst {analyst_id} finalized decision '{decision_action}' for transaction {payload.transaction_id}",
        transaction_id=payload.transaction_id,
        details={
            "decision_id": decision_obj.decision_id,
            "analyst_decision": decision_action,
            "ai_recommendation": ai_rec,
            "reason": payload.reason.strip(),
            "new_status": new_tx_status
        }
    )

    return decision_obj


@router.get("", response_model=List[Decision])
async def list_decisions(limit: int = 50):
    """List historical analyst decisions."""
    dec_coll = db_manager.get_collection("decisions")
    cursor = dec_coll.find().sort("created_at", -1).limit(limit)
    decs = await cursor.to_list(length=limit)
    return [Decision(**d) for d in decs]
