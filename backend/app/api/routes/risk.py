import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status

from backend.app.db.mongodb import db_manager
from backend.services.risk_engine import risk_engine
from backend.services.risk_simulator import risk_simulator
from backend.app.models.schemas import RiskScore

logger = logging.getLogger("riskshield.api.risk")
router = APIRouter(prefix="/risk", tags=["Risk Scoring"])


@router.post("/simulate", response_model=Dict[str, Any])
async def simulate_risk_scenario(payload: Dict[str, Any]):
    """
    Simulate counterfactual what-if scenario by perturbing transaction attributes
    and re-running the risk engine without altering database records.
    """
    tx_id = payload.get("transaction_id")
    overrides = payload.get("overrides", {})
    base_tx = payload.get("transaction")

    if not base_tx and tx_id:
        tx_coll = db_manager.get_collection("transactions")
        base_tx = await tx_coll.find_one({"transaction_id": tx_id})

    if not base_tx:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'transaction' payload or valid 'transaction_id' is required for simulation."
        )

    return risk_simulator.simulate_counterfactual(base_tx, overrides)


@router.get("/counterfactuals/{transaction_id}", response_model=List[Dict[str, Any]])
async def get_counterfactual_reductions(transaction_id: str):
    """
    Calculate 'What Would Reduce the Risk?' explanations for a transaction.
    """
    tx_coll = db_manager.get_collection("transactions")
    tx = await tx_coll.find_one({"transaction_id": transaction_id})
    if not tx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction {transaction_id} not found."
        )

    return risk_simulator.generate_counterfactual_reductions(tx)



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
