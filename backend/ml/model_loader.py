import os
import json
import logging
import joblib
from typing import Dict, Any, Optional
from backend.app.core.config import settings

logger = logging.getLogger("riskshield.ml.loader")


class ModelStore:
    _instance = None

    def __init__(self):
        self.risk_model = None
        self.anomaly_model = None
        self.scaler = None
        self.shap_explainer = None
        self.baseline_lr = None
        self.baseline_rf = None
        self.model_metrics: Dict[str, Any] = {}
        self.feature_metadata: Dict[str, Any] = {}
        self.is_loaded = False

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ModelStore()
        return cls._instance

    def load_models(self, models_dir: Optional[str] = None):
        """Load all serialized models, explainers, and metrics."""
        models_dir = models_dir or settings.ML_MODELS_DIR

        if not os.path.exists(models_dir):
            os.makedirs(models_dir, exist_ok=True)

        risk_model_path = os.path.join(models_dir, "risk_model.joblib")
        anomaly_model_path = os.path.join(models_dir, "anomaly_model.joblib")
        scaler_path = os.path.join(models_dir, "scaler.joblib")
        explainer_path = os.path.join(models_dir, "shap_explainer.joblib")
        lr_path = os.path.join(models_dir, "baseline_lr.joblib")
        rf_path = os.path.join(models_dir, "baseline_rf.joblib")
        metrics_path = os.path.join(models_dir, "model_metrics.json")
        meta_path = os.path.join(models_dir, "feature_metadata.json")

        # If models are not yet trained, trigger training automatically
        if not os.path.exists(risk_model_path) or not os.path.exists(anomaly_model_path):
            logger.info("Model artifacts not found. Initiating on-the-fly training...")
            try:
                from backend.scripts.train_model import train_and_evaluate_all
                train_and_evaluate_all()
            except Exception as e:
                logger.error(f"Error training models: {e}")

        try:
            if os.path.exists(risk_model_path):
                self.risk_model = joblib.load(risk_model_path)
            if os.path.exists(anomaly_model_path):
                self.anomaly_model = joblib.load(anomaly_model_path)
            if os.path.exists(scaler_path):
                self.scaler = joblib.load(scaler_path)
            if os.path.exists(explainer_path):
                self.shap_explainer = joblib.load(explainer_path)
            if os.path.exists(lr_path):
                self.baseline_lr = joblib.load(lr_path)
            if os.path.exists(rf_path):
                self.baseline_rf = joblib.load(rf_path)

            if os.path.exists(metrics_path):
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.model_metrics = json.load(f)

            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.feature_metadata = json.load(f)

            self.is_loaded = True
            logger.info("Successfully loaded RiskShield ML models and metadata.")
        except Exception as e:
            logger.error(f"Error loading models from {models_dir}: {e}")


model_store = ModelStore.get_instance()
