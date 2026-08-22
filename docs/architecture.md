# RISKSHIELD AI - System Architecture

## Architectural Philosophy
RISKSHIELD AI operates on an explainable, human-in-the-loop risk management lifecycle:
**DETECT → SCORE → EXPLAIN → INVESTIGATE → RECOMMEND → REVIEW → AUDIT**

```
                         ┌──────────────────────────────────────────────┐
                         │  Transaction Sources (API / Batch / Demo)   │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │  FastAPI Backend & Pydantic Validation       │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │  Feature Engineering Pipeline (27 Features)  │
                         └──────────────────────┬───────────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        ┌─────────────────────────┐                           ┌─────────────────────────┐
        │ Supervised ML (XGBoost) │                           │ Isolation Forest        │
        │ Fraud Probability [0,1] │                           │ Anomaly Score [0,1]     │
        └────────────┬────────────┘                           └────────────┬────────────┘
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │ Configurable Risk Scoring Engine (0-100)     │
                         │ Composite = f(ML, Anomaly, Velocity, ...)    │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │ SHAP Explainability Engine (TreeSHAP)        │
                         │ Feature Contributions & Human Interpretations│
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │ AI Investigation Agent (LLM + Fallback)      │
                         │ Structured JSON Dossier                      │
                         └──────────────────────┬───────────────────────┘
                                                │
                   ┌────────────────────────────┼────────────────────────────┐
                   ▼                            ▼                            ▼
               APPROVE                        REVIEW                        HOLD
                   │                            │                            │
                   └────────────────────────────┼────────────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │ Human Analyst Review & Decision Action       │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │ Immutable Audit Trail & Event Logger         │
                         └──────────────────────┬───────────────────────┘
                                                │
                                                ▼
                         ┌──────────────────────────────────────────────┐
                         │ React Dashboard (Vite, Tailwind, Recharts)   │
                         └──────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Ingestion & Validation Layer
- FastAPI REST endpoints receiving transaction payloads with strict Pydantic schema validation.
- Dual-mode database manager (MongoDB with automatic embedded in-memory document store fallback).

### 2. Feature Engineering Pipeline
- Unified, leak-free 27-feature calculation across transaction, customer profile, velocity, hardware device, geolocation, and behavioral z-score dimensions.

### 3. Dual-Model Machine Learning Engine
- **Supervised Classifier**: XGBoost gradient-boosted trees trained with `scale_pos_weight` and logloss evaluation.
- **Unsupervised Anomaly Detector**: Isolation Forest mapping multidimensional density outliers into normalized `[0, 1]` anomaly scores.

### 4. Explainable Risk Engine
- Composite 0-100 score combining:
  - Supervised fraud probability (35%)
  - Unsupervised anomaly score (20%)
  - Velocity burst risk (15%)
  - Behavioral deviation score (15%)
  - Device risk (10%)
  - Geolocation risk (5%)
- Tiers: `LOW` (0-30), `MEDIUM` (31-70), `HIGH` (71-100).
- TreeSHAP local attribution generating machine- and human-readable factor descriptions.

### 5. AI Investigation Agent
- Contextual multi-factor evidence synthesis using OpenAI-compatible LLM endpoints.
- Built-in Deterministic AI Investigation Fallback engine ensuring 100% functionality without external API keys.

### 6. Fraud Intelligence & Graph Clustering
- Graph linkage algorithm connecting shared devices and proxy IPs across multiple customer accounts.
- Time-window rolling spike detector identifying abnormal fraud volume waves.

### 7. Human-in-the-Loop & Immutable Audit Trail
- Mandatory analyst justification on all actions (`APPROVE`, `HOLD`, `BLOCK`, `ESCALATE`).
- Immutable event logging with timestamps, actors, and model versions.
