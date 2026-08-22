import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status

from backend.app.db.mongodb import db_manager
from backend.services.risk_engine import risk_engine
from backend.app.models.schemas import RiskScore

logger = logging.getLogger("riskshield.api.risk")
router = APIRouter(prefix="/risk", tags=["Risk Scoring"])


@router.post("/score", response_model=RiskScore)
async def score_arbitrary_transaction(payload: Dict[str, Any]):
    """
    Score any arbitrary transaction payload in real time using the composite risk engine.
    """
    try:
        score_obj = risk_engine.score_transaction(payload)
        return score_obj
    except Exception as e:
        logger.error(f"Error scoring transaction: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to calculate risk score: {str(e)}"
        )


@router.get("/{transaction_id}", response_model=RiskScore)
async def get_risk_score_for_transaction(transaction_id: str):
    """
    Retrieve stored risk score or compute immediately from transaction record.
    """
    risk_coll = db_manager.get_collection("risk_scores")
    tx_coll = db_manager.get_collection("transactions")

    stored = await risk_coll.find_one({"transaction_id": transaction_id})
    if stored:
        return RiskScore(**stored)

    # Compute on the fly if not cached
    tx = await tx_coll.find_one({"transaction_id": transaction_id})
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found"
        )

    score_obj = risk_engine.score_transaction(tx)
    await risk_coll.insert_one(score_obj.model_dump())
    return score_obj
