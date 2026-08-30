# 🛡️ RiskShield AI
**Intelligent Payment Risk & Fraud Intelligence Platform**
    Detect. Explain. Investigate. Decide. Audit
RiskShield AI is an intelligent financial risk-management platform designed to help analysts detect suspicious payment activity, understand the reasons behind risk scores, uncover coordinated fraud networks, investigate cases using AI-assisted evidence synthesis, and maintain a complete audit trail of decisions.
Instead of treating fraud detection as a simple "fraud / not fraud" classification problem, RiskShield turns individual risk signals into an end-to-end investigation workflow.    
    
## 🚨 The Problem
Modern payment fraud is becoming increasingly sophisticated.
A transaction may appear suspicious because of:
- Unusually high transaction amounts
- Sudden spending-pattern changes
- Abnormal transaction velocity
- New or unrecognized devices
- Suspicious IP infrastructure
- Multiple accounts sharing the same device
- Coordinated transaction activity
- Behavioral deviations from historical patterns
However, simply assigning a fraud probability is not enough for a risk analyst.
Analysts need to know:
Why is this transaction risky?
What evidence supports the decision?
Are other accounts connected to the same suspicious infrastructure?
What should the analyst do next?
Can the final decision be audited later?
**RiskShield AI** is designed to answer these questions in a single workflow.

## 💡Our Solution
```
DETECT ──► SCORE ──► EXPLAIN ──► INVESTIGATE ──► RECOMMEND ──► REVIEW ──► AUDIT
```
RiskShield AI combines:
Machine Learning + Anomaly Detection + Explainable AI + Fraud Graph Intelligence + AI Investigation + Human-in-the-Loop Decisions + Immutable Auditability
into one risk-management platform.

1. **DETECT**: Ingests transactions via REST APIs or batch files and validates schemas.
2. **SCORE**: Computes a transparent, explainable 0–100 composite risk score across ML, anomaly, velocity, behavioral, device, and location signals.
3. **EXPLAIN**: Generates local TreeSHAP attribution breakdowns showing exact positive and negative feature contributions.
4. **INVESTIGATE**: Autonomous AI Investigation Agent synthesizes transaction facts, customer history, and network links into structured intelligence dossiers.
5. **RECOMMEND**: Suggests automated policy actions (`APPROVE`, `REVIEW`, `HOLD`, `ESCALATE`) with confidence ratings.
6. **REVIEW**: Keeps human risk analysts in the loop for high-impact decisions with mandatory justification logging.
7. **AUDIT**: Permanently logs every decision and automated assessment into an immutable audit trail.

Core workflow

**. Payment Transaction
        ↓
. Risk Scoring
        ↓
. ML + Anomaly Detection
        ↓
. SHAP Explainability
        ↓
. Risk Alert
        ↓
. AI Investigation
        ↓
. Fraud Network Analysis
        ↓
. Analyst Decision
        ↓
. Immutable Audit Trail**


## 🛠️ Technology Stack

**Frontend**
- React
- JavaScript / TypeScript
- HTML5
- CSS
- Responsive dashboard UI
 
**Machine Learning**
- Python
- XGBoost
- Scikit-learn
- Isolation Forest
- SHAP / TreeSHAP
- Feature engineering

**Data**
- Transactional data
- Customer profiles
- Device information
- IP/network signals
- Behavioral features
 
**Risk Intelligence**
- Graph-based relationship analysis
- Device linkage
- IP linkage
- Fraud cluster detection
- Rolling-window anomaly detection
  
**AI**
- AI-assisted investigation
- Evidence synthesis
- Risk explanation
- Policy recommendation
  
**Audit & Governance**
- Analyst decision logging
- Alert status history
- Model version tracking
- Immutable audit events

---

## ✨Key Features
Every transaction receives a normalized 0–100 risk score.
Example:
Risk Score: 82 / 100
Risk Level: HIGH
The scoring system combines multiple signals such as:
- Transaction amount
- Historical spending behavior
- Transaction velocity
- Device identity
- Country changes
- Recent transaction activity
- Behavioral deviation
- Anomaly signals.
---

## 🔍Explainable AI with SHAP
A major problem with fraud detection systems is the black-box problem.
RiskShield uses TreeSHAP-based feature attribution to explain why a transaction received its risk score.
Example:
amount_zscore                  +5.773
spending_pattern_deviation     +1.393
amount_last_10min              +1.368
transactions_last_5min         -0.295

Instead of simply saying:
"This transaction is risky."

RiskShield explains:
**"This transaction is risky primarily because its amount is significantly outside the customer's normal spending pattern."**

Risk-increasing signals:
🔴 High transaction amount
🔴 Abnormal spending deviation
🔴 Unusual velocity
🔴 Unrecognized device

Risk-reducing signals:
🟢 Normal recent transaction velocity
🟢 Recognized device
🟢 Established customer relationship

## 🔧Quick Installation
**1. Clone & Setup Backend**
```bash
# Navigate to project directory
cd riskshield-ai

# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Generate synthetic demo data & train ML models
python backend/scripts/generate_data.py
python backend/scripts/train_model.py

# Run backend test suite
pytest backend/tests -v

# Start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend will be live at `http://localhost:8000` (API Docs at `http://localhost:8000/docs`).

**2. Setup & Start Frontend**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The dashboard will be available at `http://localhost:3000`.

---

## 🧠AI Investigation Agent
RiskShield includes an AI-assisted investigation workflow.
The Investigation Agent synthesizes:
- ML risk signals
- Anomaly scores
- SHAP factors
- Customer history
- Device information
- Transaction relationships
- Fraud-network evidence
into an analyst-friendly investigation report.

**Example output**
EXECUTIVE ASSESSMENT

Transaction classified as HIGH RISK.

Primary risk signals:
• Extreme transaction amount deviation
• Unrecognized device
• Abnormal spending behavior
• Elevated transaction velocity

AI Recommendation:
HOLD
Confidence:
95%
Human Review:
REQUIRED
The AI assists the analyst but does not replace the final human decision

## 🕸️Fraud Intelligence & Network Analysis
Fraud is often coordinated.
RiskShield therefore analyzes relationships between:
Customer
   │
   ├── Device
   │
   ├── IP Address
   │
   └── Transactions

This enables detection of:
**Fraud Rings & Clusters**
Identify groups of accounts connected through suspicious infrastructure.
Example:
 **13 Accounts
      ↓
 15 Transactions
      ↓
 Shared Device
      ↓
 Shared Proxy / IP**

The system calculates:
- Number of affected accounts
- Number of transactions
- Fraud count
- Total amount at risk
- Shared devices
- Shared IP infrastructure
- Risk severity
This allows analysts to investigate # fraud networks rather than isolated transactions. #
---

## 📈Fraud Spikes & Surge Detection
RiskShield monitors transaction activity over rolling time windows.
The system compares current fraud activity against a historical baseline.
Example:
 **Historical Fraud Rate: 4.5%
 Current Activity
       ↓
 Deviation Detected
       ↓
 Potential Fraud Surge
       ↓
 Risk Alert**

 **This helps identify coordinated attacks and unusual bursts of suspicious activity.**

## 📱Multi-Account Device Intelligence
Suspicious devices can connect multiple customer accounts.
RiskShield maintains a device-level inventory showing:
- Device ID
- Linked accounts
- Transaction count
- Fraud count
- Total transaction amount
- Risk severity
Example:
**DEV_CARDING_RING_404**

**13 linked accounts
15 transactions
15 fraud-associated transactions**

**Risk:**
CRITICAL

**This provides a useful investigation starting point for identifying coordinated account activity.**


## 🚨Risk Alert Management
RiskShield automatically surfaces high-risk activity through a centralized alert queue.
Alerts contain:
- Risk severity
- Transaction ID
- Risk score
- Customer
- Trigger reason
- Linked transaction
- Current status

Supported alert states:
  **OPEN
   ↓
 INVESTIGATING
   ↓
 RESOLVED**

 *Additional states such as DISMISSED can be used when an alert is determined to be non-actionable.*

 ## 👨‍💻Human-in-the-Loop Analyst Decisions
RiskShield is designed around a human-in-the-loop approach.

Analysts can choose:
**Approve Payment**
Clear the transaction for settlement.
**Place Hold**
Pause the transaction for additional investigation.
**Block & Decline**
Decline and mark the transaction as confirmed fraud.
**Escalate to SIU**
Forward the case to Special Investigations.

The analyst must provide a justification before finalizing the decision.
This prevents automated models from becoming the sole decision-maker.

 ## 🔐Immutable Audit Trai
Every important action is recorded.
The audit trail captures events such as:

**TRANSACTION_INGESTED
AI_INVESTIGATION_COMPLETED
HUMAN_DECISION_RECORDED
ALERT_STATUS_UPDATED**

Each record can contain:
- Event ID
- Timestamp
- Event type
- Actor
- Transaction ID
- Action summary
- Model version
This provides traceability from:
Transaction → AI analysis → Alert → Investigation → Human decision.

 ## 📊Model Performance Dashboard
RiskShield includes a dedicated ML performance dashboard.
It provides:
- F1 Score
- ROC-AUC
- PR-AUC
- Precision
- Recall
- False Positive Rate
- Confusion Matrix
- Feature Importance
Example evaluation:

Test Samples: 1,577

F1 Score       1.0000
ROC-AUC        1.0000
PR-AUC         1.0000
Precision      100%
Recall         100%
FPR            0.1%

**Note: These metrics represent the project's current evaluation/demo dataset and should not be interpreted as guaranteed real-world production performance.**


 ## 💰Financial ROI & Risk Analytics
RiskShield translates fraud detection into business impact.
The analytics dashboard provides indicators such as:
- Potential amount protected
- False-positive cost
- Average investigation time
- Net risk-shield ROI

The objective is to connect:

Better Detection
       ↓
Faster Investigation
       ↓
Reduced Fraud Loss
       ↓
Reduced Analyst Workload
       ↓
Improved Risk Operations.

 ## 🏦Financial Facility Risk Intelligence
Optional/extended RiskShield capability
RiskShield can also evaluate broader financial facilities such as:
- Education Loans
- Health / Medical Loans
- Home Loans
- Personal Loans
- MSME Loans
- Vehicle Loans
- Agriculture Loans
- Consumer Loans
Instead of simply saying "Invest" or "Don't Invest", the system provides a transparent risk assessment.
Example:

EDUCATION LOAN
Risk Score: 42 / 100
Risk Level:
MODERATE
Default Risk:
38 / 100
Liquidity Risk:
52 / 100
Data Confidence:
86%
Primary Risk:
Repayment Capacity
Risk Suitability:
MODERATE RISK.

The assessment can include:
- Default risk
- Loss severity
- Liquidity risk
- Concentration risk
- Repayment risk
- Supporting factors
- Risk-reducing factors
- Confidence score
- Scenario analysis.

**Important**
This feature is intended as an analytical decision-support system, not financial or investment advice.
Where demo/simulated data is used, it is clearly labeled.


 ## 🧪 Interactive Demo Scenarios
RiskShield includes predefined scenarios for demonstrating different risk patterns.
Examples include:
**High-Value Transaction**
Abnormally large transaction compared with historical spending.
**Fraud Spike**
Multiple suspicious transactions occurring within a short time period.
**Unrecognized Device**
Transaction originating from previously unseen hardware.
**Shared Device Fraud Ring**
Multiple accounts connected through suspicious hardware.
**Suspicious IP Infrastructure**
Multiple accounts associated with the same proxy/IP.

**These scenarios make the platform easy to demonstrate during evaluation.**


 ## 🏗️ System Architecture
                    ┌──────────────────────┐
                    │   Payment Events     │
                    │ Transactions / Data  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Feature Engineering  │
                    │ Behavioral Signals   │
                    └──────────┬───────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
                ▼                             ▼
      ┌──────────────────┐         ┌──────────────────┐
      │ XGBoost Classifier│         │ Isolation Forest │
      └─────────┬────────┘         └─────────┬────────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                    ┌──────────────────────┐
                    │ Risk Scoring Engine  │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼───────────────┐
                │              │               │
                ▼              ▼               ▼
          ┌──────────┐   ┌───────────┐  ┌─────────────┐
          │  SHAP    │   │   Fraud   │  │ Risk Alerts │
          │Explain AI│   │  Graphs   │  └─────────────┘
          └────┬─────┘   └─────┬─────┘
               │               │
               └───────┬───────┘
                       ▼
              ┌──────────────────┐
              │ AI Investigation │
              │     Agent        │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Human Analyst    │
              │ Decision         │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Immutable Audit  │
              │      Trail       │
              └──────────────────┘
---

## 📂 Project Structure
```text
RiskShield-AI/
│
├── backend/
│   ├── app/
│   │   ├── agent/              # AI investigation agent
│   │   ├── api/                # Backend API endpoints
│   │   ├── audit/              # Immutable audit functionality
│   │   ├── core/               # Core configuration and utilities
│   │   ├── db/                 # Database layer
│   │   ├── models/             # Data models
│   │   └── main.py             # Backend entry point
│   │
│   ├── ml/
│   │   ├── explainability.py   # SHAP/model explainability
│   │   ├── model_loader.py     # ML model loading
│   │   └── prediction.py       # Fraud/risk prediction
│   │
│   ├── scripts/
│   │   ├── generate_data.py    # Demo/training data generation
│   │   └── train_model.py      # Model training pipeline
│   │
│   ├── services/
│   │   ├── analytics.py
│   │   ├── anomaly_detection.py
│   │   ├── facility_risk.py
│   │   ├── feature_engineering.py
│   │   ├── fraud_clusters.py
│   │   ├── fraud_spikes.py
│   │   ├── priority_scoring.py
│   │   ├── risk_engine.py
│   │   └── risk_simulator.py
│   │
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_agent.py
│   │   ├── test_api.py
│   │   ├── test_db.py
│   │   ├── test_enhanced_features.py
│   │   ├── test_facility_risk.py
│   │   ├── test_feature_engineering.py
│   │   ├── test_ml_models.py
│   │   ├── test_risk_engine.py
│   │   └── test_security.py
│   │
│   └── docs/
│       ├── api.md
│       ├── architecture.md
│       └── methodology.md
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
├── ml/
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
├── .gitignore
└── .dockerignore
       ↓
Reduced Analyst Workload
       ↓
Improved Risk Operations.
