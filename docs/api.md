# RISKSHIELD AI - API Reference

Base URL: `http://localhost:8000/api`

## Health Check
- `GET /health`: Returns service health, DB connection mode, active model, and AI agent mode.

## Authentication
- `POST /auth/login`: Login with email and password (`admin@riskshield.ai:admin123` or `analyst@riskshield.ai:analyst123`). Returns JWT access token.
- `GET /auth/me`: Get current authenticated user profile.

## Transactions
- `POST /transactions`: Ingest transaction, calculate features, score risk, persist, and trigger alerts if high-risk.
- `GET /transactions`: Query transactions with pagination (`limit`, `skip`) and filters (`search`, `risk_level`, `payment_method`, `status`, `min_amount`, `max_amount`).
- `GET /transactions/{transaction_id}`: Deep transaction risk view with customer history, device links, and audit trail.

## Risk Scoring
- `POST /risk/score`: Score arbitrary transaction payload in real-time.
- `GET /risk/{transaction_id}`: Retrieve stored risk score or compute immediately.

## Investigations
- `POST /investigations/{transaction_id}`: Trigger AI Investigation Agent (or deterministic fallback) on a transaction.
- `GET /investigations/{transaction_id}`: Get existing investigation report.
- `GET /investigations`: List all completed investigation dossiers.

## Alerts
- `GET /alerts`: Retrieve open risk alerts.
- `PATCH /alerts/{alert_id}`: Update alert status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).

## Analyst Decisions
- `POST /decisions`: Submit human analyst decision (`APPROVE`, `HOLD`, `BLOCK`, `ESCALATE`) with mandatory justification reason.
- `GET /decisions`: List historical analyst decisions.

## Audit Logs
- `GET /audit-logs`: Query immutable audit trail records with actor and event type filters.

## Analytics & Reporting
- `GET /analytics/overview`: Financial KPIs, total volume, amount protected, false positive cost, and model metrics.
- `GET /analytics/fraud-trend`: Daily fraud vs legitimate transaction volume timeline.
- `GET /analytics/risk-distribution`: Distribution of low, medium, and high risk scores.
- `GET /analytics/payment-methods`: Volume and fraud rate grouped by payment method.
- `GET /analytics/merchant-categories`: Volume and fraud rate grouped by merchant category.

## Machine Learning
- `GET /model/metrics`: Model evaluation comparison (Logistic Regression, Random Forest, XGBoost) on test partition.
- `GET /model/features`: Feature importance rankings and descriptions.

## Fraud Intelligence
- `GET /fraud/clusters`: Discovered fraud rings and shared infrastructure clusters.
- `GET /fraud/spikes`: Time-window rolling fraud surges.
- `GET /fraud/devices`: Suspicious devices associated with multiple customer accounts.

## Demo Controls
- `GET /demo/scenarios`: List 8 predefined demo test scenarios.
- `POST /demo/generate`: Generate and seed 10,000+ synthetic transactions.
- `POST /demo/reset`: Wipe collections and re-seed clean 10,000+ demo transactions.
