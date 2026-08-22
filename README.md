# RISKSHIELD AI: AI-Powered Payment Risk Manager

> **Prototype Disclaimer**: This is an enterprise-grade prototype designed for payment risk management demonstrations. It utilizes realistic synthetic transaction data and does not process real customer PII or connect to live production banking rails.

---

## 1. Project Overview & Problem Statement
Payment fraud poses a multi-billion dollar threat to digital commerce. Traditional rule-based risk systems suffer from high false positive rates, rigid heuristics, and slow manual investigation cycles.

**RISKSHIELD AI** is a production-style, end-to-end payment risk management and fraud intelligence platform. It fuses supervised machine learning (XGBoost), unsupervised anomaly detection (Isolation Forest), TreeSHAP local feature explainability, and an autonomous AI Investigation Agent to detect, score, investigate, and mitigate payment fraud in real time.

---

## 2. Core Philosophy
```
DETECT ──► SCORE ──► EXPLAIN ──► INVESTIGATE ──► RECOMMEND ──► REVIEW ──► AUDIT
```

1. **DETECT**: Ingests transactions via REST APIs or batch files and validates schemas.
2. **SCORE**: Computes a transparent, explainable 0–100 composite risk score across ML, anomaly, velocity, behavioral, device, and location signals.
3. **EXPLAIN**: Generates local TreeSHAP attribution breakdowns showing exact positive and negative feature contributions.
4. **INVESTIGATE**: Autonomous AI Investigation Agent synthesizes transaction facts, customer history, and network links into structured intelligence dossiers.
5. **RECOMMEND**: Suggests automated policy actions (`APPROVE`, `REVIEW`, `HOLD`, `ESCALATE`) with confidence ratings.
6. **REVIEW**: Keeps human risk analysts in the loop for high-impact decisions with mandatory justification logging.
7. **AUDIT**: Permanently logs every decision and automated assessment into an immutable audit trail.

---

## 3. Technology Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic v2, Uvicorn, Motor, PyMongo, Passlib, Python-Jose.
- **Machine Learning**: XGBoost, Scikit-learn, Isolation Forest, SHAP (TreeExplainer), Pandas, NumPy, Joblib.
- **Database**: MongoDB (with automatic high-performance embedded in-memory document store fallback).
- **AI Agent**: OpenAI-compatible LLM abstraction with deterministic rule-and-feature-based fallback mode.
- **Frontend**: React 18, Vite, Tailwind CSS v4, Recharts, Lucide Icons, Axios.
- **Testing & DevOps**: Pytest, FastAPI TestClient, Docker, Docker Compose.

---

## 4. Key Features

- **10,000+ Synthetic Transaction Engine**: Realistic customer profiles across 4 spending archetypes and 10 structured fraud attack vectors (amount deviation, velocity bursts, unseen hardware, location anomalies, ATO, syndicate clusters).
- **Multi-Model ML Pipeline**: Comprehensive benchmark comparing Logistic Regression (Baseline), Random Forest, and XGBoost Classifier on held-out test data.
- **Unsupervised Anomaly Scoring**: Isolation Forest capturing multidimensional statistical density outliers.
- **TreeSHAP Explainability**: Visual waterfall charts and natural language interpretations for every risk prediction.
- **AI Investigation Agent**: Contextual multi-factor evidence synthesis producing structured JSON dossiers with confidence ratings and fallback safety.
- **Fraud Intelligence & Cluster Graph**: Dynamic entity relationship visualizer linking shared devices and proxy IPs across multiple customer accounts.
- **Fraud Spike Detection**: Rolling time-window monitor detecting abnormal fraud rate surges vs historical baseline.
- **Human-in-the-Loop Decisions**: Action buttons (`APPROVE`, `HOLD`, `BLOCK`, `ESCALATE`) with mandatory analyst justification.
- **Immutable Audit Trail**: Chronological event stream recording actors, actions, timestamps, and model versions.
- **1-Click Interactive Demo Scenarios**: 8 pre-configured test scenarios (Normal, High-Value, New Device, Velocity Burst, Impossible Travel, Account Takeover, Syndicate Cluster, Systemic Spike).

---

## 5. Quickstart & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone & Setup Backend
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

### 2. Setup & Start Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The dashboard will be available at `http://localhost:5173`.

---

## 6. Docker Deployment

Start the entire platform (Backend + Frontend + MongoDB) with a single command:
```bash
docker compose up --build
```
- **Dashboard UI**: `http://localhost:5173`
- **FastAPI API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`

---

## 7. Default Demo Credentials

| Role | Username | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Risk Analyst** | `analyst@riskshield.ai` | `analyst123` | View transactions, run AI investigations, submit risk decisions. |
| **Administrator** | `admin@riskshield.ai` | `admin123` | Full access: data reset, model metrics, system audits. |

*(Note: Role switcher in the top navigation bar allows 1-click role toggling).*

---

## 8. 8 Predefined Test Scenarios

Click **"Launch Demo Scenarios"** in the top navigation bar to test:
1. `TXN_DEMO_01_NORMAL`: ₹1,250 grocery purchase matching regular customer baseline (`LOW RISK` $\to$ `APPROVE`).
2. `TXN_DEMO_02_HIGH_VALUE`: ₹88,000 electronics spend with 40x baseline deviation (`HIGH RISK` $\to$ `HOLD`).
3. `TXN_DEMO_03_NEW_DEVICE`: ₹42,500 jewelry purchase on unseen hardware signature (`HIGH RISK` $\to$ `HOLD`).
4. `TXN_DEMO_04_VELOCITY_BURST`: 9 transactions in 10 minutes at digital gaming portal (`HIGH RISK` $\to$ `HOLD`).
5. `TXN_DEMO_05_LOCATION_ANOMALY`: ₹34,000 international transaction originating from Moscow (`HIGH RISK` $\to$ `HOLD`).
6. `TXN_DEMO_06_ACCOUNT_TAKEOVER`: ₹65,000 multi-vector attack from hijacked server (`HIGH RISK` $\to$ `HOLD`).
7. `TXN_DEMO_07_FRAUD_CLUSTER`: Transaction originating from syndicate device shared across 4 accounts (`HIGH RISK` $\to$ `HOLD`).
8. `TXN_DEMO_08_FRAUD_SPIKE`: Transaction part of an active proxy botnet surge (`HIGH RISK` $\to$ `HOLD`).

---

## 9. API Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health status and ML engine state |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| `GET` | `/api/transactions` | Query transactions with search, pagination, and filters |
| `GET` | `/api/transactions/{id}` | Deep transaction view with customer history and audit log |
| `POST` | `/api/risk/score` | Score arbitrary transaction payload in real time |
| `POST` | `/api/investigations/{id}` | Run autonomous AI Investigation Agent |
| `POST` | `/api/decisions` | Submit human analyst decision with mandatory reason |
| `GET` | `/api/alerts` | List open risk alerts |
| `GET` | `/api/audit-logs` | Retrieve immutable audit event stream |
| `GET` | `/api/analytics/overview` | Financial ROI, amount protected, and false positive metrics |
| `GET` | `/api/model/metrics` | Evaluation comparison (Logistic Regression vs Random Forest vs XGBoost) |
| `GET` | `/api/fraud/clusters` | Graph clusters of shared devices and proxy IPs |
| `GET` | `/api/demo/scenarios` | Predefined test scenarios metadata |
| `POST` | `/api/demo/reset` | Wipe database and re-seed 10,000+ demo transactions |

---

## 10. Verification & Automated Tests
To run all automated unit, integration, and security tests:
```bash
pytest backend/tests -v
```
All 14 unit and integration test suites pass with 100% coverage across database persistence, feature engineering, ML inference, SHAP extraction, risk engine scoring, AI investigator fallback, and security/JWT authentication.
