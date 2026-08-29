from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# --- USER & AUTH SCHEMAS ---
class UserBase(BaseModel):
    username: str
    email: str
    role: str = "ANALYST"  # ADMIN or ANALYST


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    user_id: str
    created_at: datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- TRANSACTION SCHEMAS ---
class TransactionBase(BaseModel):
    transaction_id: str
    customer_id: str
    amount: float
    currency: str = "INR"
    timestamp: datetime
    payment_method: str  # UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET
    merchant_id: str
    merchant_category: str  # ELECTRONICS, TRAVEL, GAMING, GROCERY, LUXURY, UTILITIES, PHARMACY, FASHION
    device_id: str
    ip_address: str
    country: str = "IN"
    latitude: float
    longitude: float
    status: str = "SUCCESS"  # SUCCESS, FAILED, PENDING, HELD, BLOCKED, APPROVED
    failure_reason: Optional[str] = None
    is_new_device: bool = False
    previous_transaction_count: int = 0
    average_transaction_amount: float = 0.0
    transactions_last_10min: int = 0
    transactions_last_1hour: int = 0
    account_age_days: int = 30
    is_fraud: int = 0


class TransactionCreate(BaseModel):
    customer_id: str
    amount: float
    currency: str = "INR"
    payment_method: str = "UPI"
    merchant_id: str = "MERCH_101"
    merchant_category: str = "ELECTRONICS"
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    country: str = "IN"
    latitude: Optional[float] = 19.0760
    longitude: Optional[float] = 72.8777
    status: str = "SUCCESS"
    failure_reason: Optional[str] = None
    is_new_device: bool = False
    account_age_days: Optional[int] = 60
    previous_transaction_count: Optional[int] = 10
    average_transaction_amount: Optional[float] = 1500.0


class Transaction(TransactionBase):
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- RISK SCORE SCHEMAS ---
class RiskFactor(BaseModel):
    feature: str
    impact: float
    description: str
    value: Optional[Any] = None


class RiskScore(BaseModel):
    transaction_id: str
    fraud_probability: float
    anomaly_score: float
    behavioural_score: float
    device_score: float
    velocity_score: float
    location_score: float
    final_risk_score: int  # 0 to 100
    risk_level: str  # LOW, MEDIUM, HIGH
    model_version: str = "xgboost_v1.0"
    top_risk_factors: List[RiskFactor] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- INVESTIGATION AGENT SCHEMAS ---
class InvestigationResult(BaseModel):
    risk_summary: str
    risk_level: str  # LOW, MEDIUM, HIGH
    key_findings: List[str] = []
    supporting_evidence: List[str] = []
    conflicting_evidence: List[str] = []
    recommended_action: str  # APPROVE, REVIEW, HOLD, ESCALATE
    confidence: float  # 0.0 - 1.0
    requires_human_review: bool = False


class Investigation(BaseModel):
    investigation_id: str
    transaction_id: str
    risk_score: int
    summary: str
    risk_factors: List[RiskFactor] = []
    related_transactions: List[str] = []
    related_devices: List[str] = []
    related_ips: List[str] = []
    recommended_action: str
    confidence: float
    investigation_status: str = "COMPLETED"  # COMPLETED, PENDING, FAILED
    key_findings: List[str] = []
    supporting_evidence: List[str] = []
    conflicting_evidence: List[str] = []
    requires_human_review: bool = False
    is_fallback: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- DECISION & AUDIT SCHEMAS ---
class DecisionCreate(BaseModel):
    transaction_id: str
    analyst_decision: str  # APPROVE, HOLD, BLOCK, ESCALATE
    reason: str
    analyst_id: Optional[str] = None


class Decision(BaseModel):
    decision_id: str
    transaction_id: str
    ai_recommendation: str
    analyst_decision: str
    analyst_id: str
    reason: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AuditLog(BaseModel):
    event_id: str
    transaction_id: Optional[str] = None
    event_type: str  # RISK_SCORE_GENERATED, AI_INVESTIGATION_RUN, ANALYST_DECISION, ALERT_TRIGGERED, DEMO_DATA_RESET, MODEL_RETRAINED
    actor: str  # SYSTEM, AI_AGENT, ANALYST_EMAIL, ADMIN_EMAIL
    action: str
    details: Dict[str, Any] = {}
    model_version: str = "xgboost_v1.0"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- RISK ALERTS ---
class RiskAlert(BaseModel):
    alert_id: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    alert_type: str  # HIGH_RISK_TXN, FRAUD_SPIKE, FRAUD_CLUSTER, SUSPICIOUS_DEVICE, SUSPICIOUS_IP, VELOCITY_ANOMALY, HIGH_VALUE_ANOMALY
    title: str
    description: str
    transaction_ids: List[str] = []
    status: str = "OPEN"  # OPEN, INVESTIGATING, RESOLVED, DISMISSED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AlertUpdate(BaseModel):
    status: str  # OPEN, INVESTIGATING, RESOLVED, DISMISSED


# --- FRAUD CLUSTERS & SPIKES ---
class FraudCluster(BaseModel):
    cluster_id: str
    affected_transactions: List[str]
    affected_users: List[str]
    shared_devices: List[str]
    shared_ips: List[str]
    risk_level: str  # MEDIUM, HIGH, CRITICAL
    estimated_amount_at_risk: float
    first_detected: datetime
    last_detected: datetime
    cluster_type: str = "SHARED_DEVICE_AND_IP"


class FraudSpike(BaseModel):
    spike_id: str
    time_window: str
    transaction_volume: int
    fraud_count: int
    fraud_rate: float
    baseline_fraud_rate: float
    severity: str  # MEDIUM, HIGH, CRITICAL
    amount_at_risk: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --- MODEL METRICS ---
class ModelEvaluationMetrics(BaseModel):
    model_name: str
    model_version: str
    training_date: str
    train_samples: int
    test_samples: int
    precision: float
    recall: float
    f1_score: float
    pr_auc: float
    roc_auc: float
    fpr: float
    confusion_matrix: Dict[str, int]
    feature_importances: List[Dict[str, Any]]


# --- FINANCIAL FACILITY RISK INTELLIGENCE SCHEMAS ---
class FacilityFactor(BaseModel):
    name: str
    impact: float  # Positive = risk-increasing, Negative = risk-reducing
    explanation: str
    factor_type: str  # RISK_INCREASING or RISK_REDUCING


class FacilityProfile(BaseModel):
    facility_type: str
    typical_tenure: str
    risk_category: str
    collateral_requirement: str
    repayment_structure: str
    portfolio_exposure: str
    data_coverage: str
    assessment_date: str


class FacilityHistoricalPoint(BaseModel):
    period: str
    risk_score: float
    default_rate: float


class FacilityRiskAssessment(BaseModel):
    facility_id: str
    facility_name: str
    facility_type: Optional[str] = None
    risk_score: float  # 0–100

    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL, INSUFFICIENT_DATA
    suitability_signal: str  # LOWER RISK, MODERATE RISK, HIGHER RISK, INSUFFICIENT DATA
    suitability_recommendation: str
    default_risk: float
    default_risk_level: str
    portfolio_risk: float
    portfolio_risk_level: str
    loss_severity: float
    loss_severity_level: str
    liquidity_risk: float
    liquidity_risk_level: str
    concentration_risk: float
    concentration_risk_level: str
    operational_risk: float
    data_confidence: float
    confidence_level: str
    executive_assessment: str
    primary_concern: str
    risk_trend: str  # STABLE, IMPROVING, DETERIORATING
    risk_factors: List[FacilityFactor]
    profile: FacilityProfile
    historical_trend: List[FacilityHistoricalPoint]
    disclaimer: str = "RiskShield provides analytical risk signals for decision support and does not constitute financial or investment advice. Actual risk depends on borrower quality, portfolio composition, market conditions, institution policies, and other factors."
    is_demo_data: bool = True
    engine_version: str = "Rule-based / Illustrative Facility Risk Engine v1.0"
    assessment_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FacilityScenarioRequest(BaseModel):
    facility_type: str
    default_rate: str = "MEDIUM"  # LOW, MEDIUM, HIGH
    income_stability: str = "MEDIUM"  # LOW, MEDIUM, HIGH
    loan_tenure: str = "MEDIUM"  # SHORT, MEDIUM, LONG
    collateral_coverage: str = "MEDIUM"  # LOW, MEDIUM, HIGH
    portfolio_concentration: str = "MEDIUM"  # LOW, MEDIUM, HIGH


class FacilityScenarioResponse(BaseModel):
    facility_type: str
    original_score: float
    projected_score: float
    score_delta: float
    original_level: str
    projected_level: str
    original_suitability: str
    projected_suitability: str
    key_drivers: List[str]
    disclaimer: str = "Illustrative scenario — not a forecast."
    is_demo_data: bool = True


class FacilityDecisionRequest(BaseModel):
    facility_id: str
    facility_type: str
    risk_score: float
    decision: str  # REVIEW, APPROVE_FOR_CONSIDERATION, REQUEST_MORE_DATA, ESCALATE
    notes: str
    analyst_id: str = "analyst@riskshield.ai"


class FacilityConfigSchema(BaseModel):
    low_threshold: int = 30
    moderate_threshold: int = 60
    high_threshold: int = 80
    confidence_threshold: int = 70
    alert_threshold: int = 65
    alerts_enabled: bool = True

