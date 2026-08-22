import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from backend.app.db.mongodb import db_manager
from backend.app.models.schemas import AuditLog

logger = logging.getLogger("riskshield.audit")


async def log_audit_event(
    event_type: str,
    actor: str,
    action: str,
    transaction_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    model_version: str = "xgboost_v1.0"
) -> AuditLog:
    """Record an immutable-style audit log entry into the audit_logs collection."""
    audit_entry = AuditLog(
        event_id=f"AUD_{uuid.uuid4().hex[:12].upper()}",
        transaction_id=transaction_id,
        event_type=event_type,
        actor=actor,
        action=action,
        details=details or {},
        model_version=model_version,
        timestamp=datetime.now(timezone.utc)
    )

    try:
        coll = db_manager.get_collection("audit_logs")
        await coll.insert_one(audit_entry.model_dump())
        logger.info(f"Audit log saved: {audit_entry.event_id} | {event_type} | {actor} | {action}")
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")

    return audit_entry
