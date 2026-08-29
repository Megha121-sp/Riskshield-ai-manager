import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status

from backend.app.db.mongodb import db_manager, clean_mongo_doc
from backend.app.models.schemas import (
    FacilityRiskAssessment,
    FacilityScenarioRequest,
    FacilityScenarioResponse,
    FacilityDecisionRequest,
    FacilityConfigSchema,
    UserResponse
)
from backend.services.facility_risk import facility_risk_service
from backend.app.audit.logger import log_audit_event
from backend.app.api.routes.auth import get_current_user

logger = logging.getLogger("riskshield.api.facilities")
router = APIRouter(prefix="/facilities", tags=["Financial Facility Risk Intelligence"])


@router.get("", response_model=List[FacilityRiskAssessment])
async def list_facilities():
    """Retrieve risk assessments for all standard financial facilities."""
    await facility_risk_service.seed_facility_alerts()
    return await facility_risk_service.get_all_facilities()


@router.get("/overview-summary", response_model=Dict[str, Any])
async def get_facility_overview_summary():
    """Retrieve top-level summary metrics for the main Overview Command Center."""
    return await facility_risk_service.get_overview_summary()


@router.get("/config", response_model=FacilityConfigSchema)
async def get_facility_config():
    """Retrieve current facility risk configuration thresholds."""
    config_coll = db_manager.get_collection("facility_config")
    cfg = await config_coll.find_one({"type": "thresholds"})
    if cfg:
        return FacilityConfigSchema(**clean_mongo_doc(cfg))
    return FacilityConfigSchema(**facility_risk_service.config)


@router.post("/config", response_model=FacilityConfigSchema)
async def update_facility_config(
    payload: FacilityConfigSchema,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update facility risk configuration thresholds (Admin only)."""
    config_coll = db_manager.get_collection("facility_config")
    doc = payload.model_dump()
    doc["type"] = "thresholds"
    await config_coll.update_one({"type": "thresholds"}, {"$set": doc}, upsert=True)

    facility_risk_service.config.update(payload.model_dump())

    # Log to immutable audit trail
    await log_audit_event(
        event_type="FACILITY_CONFIG_UPDATED",
        actor=current_user.username,
        action=f"Updated facility risk thresholds: Alert={payload.alert_threshold}, High={payload.high_threshold}",
        details=payload.model_dump(),
        model_version="facility_risk_engine_v1.0"
    )

    return payload


@router.post("/simulate", response_model=FacilityScenarioResponse)
async def simulate_facility_scenario(payload: FacilityScenarioRequest):
    """Run an illustrative counterfactual scenario simulation for a facility."""
    return facility_risk_service.simulate_scenario(payload)


@router.post("/decision", response_model=Dict[str, Any])
async def record_facility_analyst_decision(
    payload: FacilityDecisionRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Record an analyst assessment decision for a financial facility and log to the immutable audit trail.
    """
    dec_coll = db_manager.get_collection("facility_decisions")
    doc = {
        "facility_id": payload.facility_id,
        "facility_type": payload.facility_type,
        "risk_score": payload.risk_score,
        "decision": payload.decision.upper(),
        "notes": payload.notes,
        "analyst_id": current_user.username or payload.analyst_id,
        "engine_version": "Rule-based / Illustrative Facility Risk Engine v1.0"
    }
    await dec_coll.insert_one(dict(doc))

    # Log immutable audit event
    audit_log = await log_audit_event(
        event_type="ANALYST_FACILITY_DECISION_RECORDED",
        actor=current_user.username or payload.analyst_id,
        action=f"Recorded '{payload.decision.upper()}' assessment for {payload.facility_type} (Score: {payload.risk_score}/100)",
        details={
            "facility_id": payload.facility_id,
            "facility_type": payload.facility_type,
            "decision": payload.decision.upper(),
            "risk_score": payload.risk_score,
            "justification": payload.notes
        },
        model_version="facility_risk_engine_v1.0"
    )

    return {
        "status": "SUCCESS",
        "message": f"Analyst assessment decision recorded for {payload.facility_type}.",
        "event_id": audit_log.event_id,
        "decision": payload.decision.upper()
    }


@router.get("/{facility_type}", response_model=FacilityRiskAssessment)
async def get_facility_detail(facility_type: str):
    """Retrieve detailed risk assessment for a specific facility type."""
    fac = await facility_risk_service.get_facility(facility_type)
    if not fac:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Facility '{facility_type}' not found in registry."
        )
    return fac
