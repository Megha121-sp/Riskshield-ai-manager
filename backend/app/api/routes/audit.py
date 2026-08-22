import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query

from backend.app.db.mongodb import db_manager
from backend.app.models.schemas import AuditLog

logger = logging.getLogger("riskshield.api.audit")
router = APIRouter(prefix="/audit-logs", tags=["Audit Trail"])


@router.get("", response_model=Dict[str, Any])
async def list_audit_logs(
    actor: Optional[str] = None,
    event_type: Optional[str] = None,
    transaction_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0)
):
    """
    Retrieve immutable audit event trail with actor and event filtering.
    """
    audit_coll = db_manager.get_collection("audit_logs")
    query: Dict[str, Any] = {}

    if actor:
        query["actor"] = {"$regex": actor, "$options": "i"}
    if event_type:
        query["event_type"] = event_type.upper()
    if transaction_id:
        query["transaction_id"] = transaction_id

    total = await audit_coll.count_documents(query)
    cursor = audit_coll.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    logs = await cursor.to_list(length=limit)

    return {
        "total": total,
        "limit": limit,
        "skip": skip,
        "logs": [AuditLog(**l).model_dump() for l in logs]
    }
