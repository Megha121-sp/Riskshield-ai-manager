from fastapi import APIRouter
from backend.app.api.routes import (
    auth,
    transactions,
    risk,
    investigations,
    alerts,
    decisions,
    audit,
    analytics,
    model,
    fraud,
    demo,
    copilot,
    search,
    customers,
    system,
    facilities
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(transactions.router)
api_router.include_router(risk.router)
api_router.include_router(investigations.router)
api_router.include_router(alerts.router)
api_router.include_router(decisions.router)
api_router.include_router(audit.router)
api_router.include_router(analytics.router)
api_router.include_router(model.router)
api_router.include_router(fraud.router)
api_router.include_router(demo.router)
api_router.include_router(copilot.router)
api_router.include_router(search.router)
api_router.include_router(customers.router)
api_router.include_router(system.router)
api_router.include_router(facilities.router)
