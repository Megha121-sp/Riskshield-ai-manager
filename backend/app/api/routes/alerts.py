import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status

from backend.app.db.mongodb import db_manager, clean_mongo_doc
from backend.app.models.schemas import RiskAlert, AlertUpdate, UserResponse
from backend.app.audit.logger import log_audit_event
from backend.app.api.routes.auth import get_current_user

logger = logging.getLogger("riskshield.api.alerts")
router = APIRouter(prefix="/alerts", tags=["Risk Alerts"])


@router.get("", response_model=List[RiskAlert])
async def get_alerts(status_filter: Optional[str] = None, limit: int = 50):
    """Retrieve risk alerts with optional status filtering."""
    alert_coll = db_manager.get_collection("risk_alerts")
    query = {}
    if status_filter:
        query["status"] = status_filter.upper()

    cursor = alert_coll.find(query).sort("created_at", -1).limit(limit)
    alerts = await cursor.to_list(length=limit)
    return [RiskAlert(**clean_mongo_doc(a)) for a in alerts]


@router.patch("/{alert_id}", response_model=RiskAlert)
async def update_alert_status(
    alert_id: str,
    payload: AlertUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Update status of a risk alert (OPEN, INVESTIGATING, RESOLVED, DISMISSED)."""
    alert_coll = db_manager.get_collection("risk_alerts")
    new_status = payload.status.upper()

    if new_status not in ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid alert status: {new_status}"
        )

    res = await alert_coll.update_one(
        {"alert_id": alert_id},
        {"$set": {"status": new_status}}
    )

    alert = await alert_coll.find_one({"alert_id": alert_id})
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert {alert_id} not found"
        )

    await log_audit_event(
        event_type="ALERT_STATUS_UPDATED",
        actor=current_user.username,
        action=f"Changed alert {alert_id} status to {new_status}",
        details={"alert_id": alert_id, "new_status": new_status}
    )

    return RiskAlert(**clean_mongo_doc(alert))
