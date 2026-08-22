import os
import json
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, status

from backend.app.core.config import settings
from backend.app.db.mongodb import db_manager
from backend.scripts.generate_data import generate_synthetic_transactions
from backend.services.risk_engine import risk_engine
from backend.app.models.schemas import RiskAlert
from backend.app.audit.logger import log_audit_event

logger = logging.getLogger("riskshield.api.demo")
router = APIRouter(prefix="/demo", tags=["Demo Management"])


DEMO_SCENARIO_DEFINITIONS = [
    {
        "id": "TXN_DEMO_01_NORMAL",
        "scenario_number": 1,
        "title": "Normal Grocery Purchase",
        "category": "Standard Verified Behavior",
        "expected_risk": "LOW",
        "expected_action": "APPROVE",
        "description": "₹1,250 UPI transaction at Blinkit from customer's primary device and home IP in Mumbai. Matches regular baseline spend.",
        "key_signals": ["Trusted device DEV_CUST_0042_0", "Regular spend magnitude", "Within home metro boundary", "Domestic IP"]
    },
    {
        "id": "TXN_DEMO_02_HIGH_VALUE",
        "scenario_number": 2,
        "title": "High-Value Luxury Spike",
        "category": "Amount Deviation Anomaly",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "₹88,000 credit card transaction at Apple Store. Customer historical average is ₹2,200 (40x deviation spike).",
        "key_signals": ["40x spend deviation over baseline", "High-value electronics merchant", "Severe amount Z-score (>6σ)"]
    },
    {
        "id": "TXN_DEMO_03_NEW_DEVICE",
        "scenario_number": 3,
        "title": "Unrecognized Device High-Value Purchase",
        "category": "Hardware Signature Risk",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "₹42,500 jewelry transaction from newly observed hardware DEV_UNSEEN_MACBOOK_X89 with foreign proxy IP.",
        "key_signals": ["Unrecognized device hardware signature", "13x average customer spend", "Anonymous proxy IP address"]
    },
    {
        "id": "TXN_DEMO_04_VELOCITY_BURST",
        "scenario_number": 4,
        "title": "Rapid-Fire Velocity Burst",
        "category": "Automated Bot / Burst Attack",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "9 repeated ₹15,000 transactions within 10 minutes at Steam India gaming portal.",
        "key_signals": ["9 transactions within 10-minute window", "14 transactions in last 1 hour", "Digital gaming merchant category"]
    },
    {
        "id": "TXN_DEMO_05_LOCATION_ANOMALY",
        "scenario_number": 5,
        "title": "Cross-Border Location Jump",
        "category": "Impossible Travel Velocity",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "₹34,000 transaction originating from Moscow, Russia (5,000+ km from user's regular home in India).",
        "key_signals": ["International cross-border transaction (RU)", "5,000+ km impossible travel distance", "Sudden high-value travel booking"]
    },
    {
        "id": "TXN_DEMO_06_ACCOUNT_TAKEOVER",
        "scenario_number": 6,
        "title": "Account Takeover (ATO) Multi-Vector Attack",
        "category": "Credential Stuffing & Takeover",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "₹65,000 purchase on a 60-day-old account from a hijacked Linux server with 7 transactions in 10 minutes.",
        "key_signals": ["Unseen device DEV_HIJACKED_LINUX_BOX", "High transaction velocity burst", "60x normal spend deviation", "Consecutive authorizations"]
    },
    {
        "id": "TXN_DEMO_07_FRAUD_CLUSTER",
        "scenario_number": 7,
        "title": "Syndicate Device Fraud Ring",
        "category": "Multi-Account Shared Device Ring",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "Transaction originating from known carding device DEV_SYNDICATE_ALPHA_99 shared across 4 distinct accounts.",
        "key_signals": ["Device shared across multiple customer accounts", "Associated with TOR exit node IP", "High-velocity coordinated gaming purchases"]
    },
    {
        "id": "TXN_DEMO_08_FRAUD_SPIKE",
        "scenario_number": 8,
        "title": "Sudden Systemic Fraud Surge",
        "category": "Systemic Wave / Proxy Botnet",
        "expected_risk": "HIGH",
        "expected_action": "HOLD",
        "description": "₹48,000 luxury purchase on proxy IP 194.26.29.112 part of an active systemic fraud spike.",
        "key_signals": ["Part of active high-severity fraud spike", "Shared proxy botnet IP", "High value luxury goods target"]
    }
]


@router.get("/scenarios", response_model=List[Dict[str, Any]])
async def get_demo_scenarios():
    """Retrieve predefined demo test scenarios with comprehensive background context."""
    return DEMO_SCENARIO_DEFINITIONS


@router.post("/generate", response_model=Dict[str, Any])
@router.post("/reset", response_model=Dict[str, Any])
async def generate_or_reset_demo_data():
    """
    Generate and seed 10,000+ realistic transactions into database with calculated risk scores and alerts.
    """
    tx_coll = db_manager.get_collection("transactions")
    risk_coll = db_manager.get_collection("risk_scores")
    alert_coll = db_manager.get_collection("risk_alerts")
    inv_coll = db_manager.get_collection("investigations")
    dec_coll = db_manager.get_collection("decisions")
    audit_coll = db_manager.get_collection("audit_logs")

    # Clear existing demo data
    await tx_coll.delete_many({})
    await risk_coll.delete_many({})
    await alert_coll.delete_many({})
    await inv_coll.delete_many({})
    await dec_coll.delete_many({})
    await audit_coll.delete_many({})

    logger.info("Generating synthetic transactions for demo seeding...")
    profiles, transactions = generate_synthetic_transactions(10500)

    # Insert transactions
    await tx_coll.insert_many(transactions)

    # Score high-profile demo transactions and sample transactions
    scores_to_insert = []
    alerts_to_insert = []

    for tx in transactions[:120]:
        sc_obj = risk_engine.score_transaction(tx)
        sc_dict = sc_obj.model_dump()
        scores_to_insert.append(sc_dict)

        if sc_obj.final_risk_score > 70:
            alert = RiskAlert(
                alert_id=f"ALT_{tx['transaction_id'][-6:]}",
                severity="CRITICAL" if sc_obj.final_risk_score >= 85 else "HIGH",
                alert_type="HIGH_RISK_TXN",
                title=f"High Risk Alert ({sc_obj.final_risk_score}/100) - {tx['customer_id']}",
                description=f"Transaction {tx['transaction_id']} of ₹{tx['amount']:,.2f} flagged with high fraud probability.",
                transaction_ids=[tx['transaction_id']],
                status="OPEN"
            )
            alerts_to_insert.append(alert.model_dump())

    if scores_to_insert:
        await risk_coll.insert_many(scores_to_insert)
    if alerts_to_insert:
        await alert_coll.insert_many(alerts_to_insert)

    # Log audit event
    await log_audit_event(
        event_type="DEMO_DATA_SEEDED",
        actor="ADMIN_SYSTEM",
        action=f"Seeded {len(transactions)} transactions and {len(scores_to_insert)} risk assessments.",
        details={"total_transactions": len(transactions), "customer_profiles": len(profiles)}
    )

    return {
        "status": "success",
        "message": f"Successfully loaded {len(transactions)} demo transactions and seeded risk scores into database.",
        "transaction_count": len(transactions),
        "customer_count": len(profiles)
    }
