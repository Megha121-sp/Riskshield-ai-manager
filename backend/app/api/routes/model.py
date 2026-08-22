import logging
from typing import Dict, Any, List
from fastapi import APIRouter

from backend.ml.model_loader import model_store

logger = logging.getLogger("riskshield.api.model")
router = APIRouter(prefix="/model", tags=["Model Performance"])


@router.get("/metrics", response_model=Dict[str, Any])
async def get_model_metrics():
    """
    Retrieve comprehensive ML evaluation metrics, test set results,
    confusion matrix, and comparative benchmarks across Logistic Regression, Random Forest, and XGBoost.
    """
    if not model_store.is_loaded:
        model_store.load_models()

    return model_store.model_metrics


@router.get("/features", response_model=Dict[str, Any])
async def get_model_features():
    """
    Retrieve feature list, descriptions, and active model feature importance ranking.
    """
    if not model_store.is_loaded:
        model_store.load_models()

    active_model = model_store.model_metrics.get("active_model", {})
    return {
        "feature_names": model_store.feature_metadata.get("feature_names", []),
        "feature_descriptions": model_store.feature_metadata.get("feature_descriptions", {}),
        "feature_importances": active_model.get("feature_importances", [])
    }
