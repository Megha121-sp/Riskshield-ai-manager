import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.logging import setup_logging
from backend.app.db.mongodb import db_manager
from backend.app.api.api_router import api_router
from backend.app.api.routes.auth import ensure_default_users
from backend.ml.model_loader import model_store
from backend.scripts.generate_data import save_and_seed_data
from backend.services.risk_engine import risk_engine
from backend.app.models.schemas import RiskAlert

setup_logging()
logger = logging.getLogger("riskshield.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing RiskShield AI backend services...")
    
    # 1. Connect to Database (MongoDB or In-Memory Store)
    await db_manager.connect()
    
    # 2. Ensure default users (admin & analyst)
    await ensure_default_users()

    # 3. Load Machine Learning Models and Metadata
    model_store.load_models()

    # 4. Auto-seed Demo Data if database is currently empty
    tx_coll = db_manager.get_collection("transactions")
    count = await tx_coll.count_documents({})
    if count == 0:
        logger.info("Database empty. Auto-seeding initial synthetic dataset...")
        try:
            transactions, profiles = save_and_seed_data()
            await tx_coll.insert_many(transactions)
            
            # Pre-score top transactions
            risk_coll = db_manager.get_collection("risk_scores")
            alert_coll = db_manager.get_collection("risk_alerts")
            scores = []
            alerts = []
            for tx in transactions[:150]:
                sc = risk_engine.score_transaction(tx)
                scores.append(sc.model_dump())
                if sc.final_risk_score > 70:
                    alerts.append(RiskAlert(
                        alert_id=f"ALT_{tx['transaction_id'][-6:]}",
                        severity="CRITICAL" if sc.final_risk_score >= 85 else "HIGH",
                        alert_type="HIGH_RISK_TXN",
                        title=f"High Risk Flagged ({sc.final_risk_score}/100) - {tx['customer_id']}",
                        description=f"Transaction {tx['transaction_id']} (₹{tx['amount']:,.2f}) scored {sc.final_risk_score}/100.",
                        transaction_ids=[tx['transaction_id']],
                        status="OPEN"
                    ).model_dump())
            if scores:
                await risk_coll.insert_many(scores)
            if alerts:
                await alert_coll.insert_many(alerts)
            logger.info(f"Auto-seeded {len(transactions)} transactions successfully.")
        except Exception as e:
            logger.error(f"Error during auto-seeding: {e}")

    yield

    # Cleanup
    await db_manager.disconnect()
    logger.info("RiskShield AI backend services shut down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="AI-Powered Payment Risk Manager & Fraud Detection Platform",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": "in_memory_fallback" if db_manager.is_memory_mode else "mongodb_connected",
        "ml_models_loaded": model_store.is_loaded,
        "active_model": model_store.model_metrics.get("active_model", {}).get("model_name", "XGBoost Fraud Classifier"),
        "ai_agent_mode": "OpenAI / LLM API" if settings.LLM_API_KEY else "Deterministic AI Investigation Mode (Demo Fallback)"
    }


# Include Master API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error occurred. Please review server logs."}
    )
