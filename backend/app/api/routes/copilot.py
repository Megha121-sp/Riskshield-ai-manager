import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, status

from backend.app.agent.copilot import risk_copilot

logger = logging.getLogger("riskshield.api.copilot")
router = APIRouter(prefix="/copilot", tags=["Risk Copilot"])


class CopilotChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


@router.post("/chat", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
async def chat_with_copilot(payload: CopilotChatRequest):
    """
    Interact with the Risk Copilot AI assistant to query transactions, devices,
    customers, fraud clusters, and portfolio anomalies grounded in live data.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        response = await risk_copilot.ask(payload.message, payload.context)
        return response
    except Exception as e:
        logger.error(f"Copilot inference error: {e}", exc_info=True)
        return {
            "answer": "I don't have enough evidence to determine that at this moment.",
            "tools_used": [],
            "citations": [],
            "suggested_followups": ["What should I investigate first?", "Why did risk increase today?"]
        }
