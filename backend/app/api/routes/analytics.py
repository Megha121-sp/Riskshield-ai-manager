import logging
from typing import Dict, Any, List
from fastapi import APIRouter

from backend.services.analytics import (
    compute_overview_metrics,
    compute_fraud_trends,
    compute_payment_method_breakdown,
    compute_merchant_category_breakdown,
    compute_period_changes,
    compute_executive_scorecard
)

logger = logging.getLogger("riskshield.api.analytics")
router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])


@router.get("/changes", response_model=Dict[str, Any])
async def get_period_changes():
    """Retrieve 'What Changed Today?' period comparisons and root-cause analysis."""
    return await compute_period_changes()


@router.get("/executive-scorecard", response_model=Dict[str, Any])
async def get_scorecard():
    """Retrieve executive risk scorecard and business impact metrics."""
    return await compute_executive_scorecard()



@router.get("/overview", response_model=Dict[str, Any])
async def get_overview_metrics():
    """Retrieve executive risk management KPIs calculated from live database state."""
    return await compute_overview_metrics()


@router.get("/fraud-trend", response_model=List[Dict[str, Any]])
async def get_fraud_trends():
    """Retrieve daily fraud volume and transaction trend timeseries."""
    return await compute_fraud_trends()


@router.get("/risk-distribution", response_model=Dict[str, Any])
async def get_risk_distribution():
    """Retrieve current distribution of LOW, MEDIUM, and HIGH risk categorizations."""
    metrics = await compute_overview_metrics()
    return {
        "low_risk": metrics.get("low_risk_count", 0),
        "medium_risk": metrics.get("medium_risk_count", 0),
        "high_risk": metrics.get("high_risk_count", 0),
        "total": metrics.get("total_transactions", 0)
    }


@router.get("/payment-methods", response_model=List[Dict[str, Any]])
async def get_payment_methods():
    """Retrieve transaction volume and fraud rate grouped by payment method."""
    return await compute_payment_method_breakdown()


@router.get("/merchant-categories", response_model=List[Dict[str, Any]])
async def get_merchant_categories():
    """Retrieve transaction volume and fraud rate grouped by merchant category."""
    return await compute_merchant_category_breakdown()
