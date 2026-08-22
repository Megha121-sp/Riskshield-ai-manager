# RISKSHIELD AI - Machine Learning & Risk Methodology

## 1. Synthetic Dataset Architecture
To model realistic financial transaction dynamics without utilizing customer PII or proprietary production data, RISKSHIELD AI constructs a 10,000+ transaction dataset rooted in 350 distinct customer spending profiles.

Each customer profile defines:
- **Spending Archetype**: Student, Young Professional, Affluent Family, High Net Worth.
- **Normal Spending Distributions**: Mean ($\mu$) and standard deviation ($\sigma$).
- **Home Metro Perimeter**: Geolocation coordinates within major Indian metros with $<10$ km normal commute jitter.
- **Hardware Footprint**: Primary and secondary recognized device IDs.
- **Network Footprint**: Home IP subnet.
- **Payment & Merchant Preferences**: UPI, Credit Card, Debit Card, Grocery, Dining, Travel, Electronics, etc.

## 2. Injected Fraud Patterns
Fraud is structured across 10 distinct real-world attack vectors:
1. **Amount Deviation**: High multiplier ($8\times - 25\times$) spend deviation over historical mean.
2. **Velocity Bursts**: Rapid-fire automated attacks ($6 - 14$ transactions in $<10$ minutes).
3. **Unrecognized Hardware**: High-value transactions originating from an unseen device ID.
4. **Geolocation Anomalies**: Impossible travel speed (e.g. cross-border activity in Moscow or London).
5. **Carding / Authorization Failures**: Consecutive CVV or PIN failures prior to high-value transaction.
6. **Off-Peak Night Anomalies**: High-risk gaming/digital transactions executed between 1:00 AM and 5:00 AM.
7. **Multi-Account Device Clusters**: Single syndicate hardware device linked to $3+$ distinct accounts.
8. **Multi-Account Proxy Clusters**: High-risk proxy/VPN IP coordinating multiple account transactions.
9. **Account Age Exploitation**: Newly created accounts ($<3$ days old) with immediate maximum volume.
10. **Coordinated Transaction Bursts**: Simultaneous attacks across multiple high-velocity digital merchants.

## 3. Feature Engineering Pipeline
The feature engineering engine calculates 27 features uniformly across training, testing, and production inference:
- **Transaction-level**: `amount`, `merchant_category_encoded`, `payment_method_encoded`, `transaction_hour`, `day_of_week`.
- **Customer-level**: `account_age_days`, `historical_transaction_count`, `historical_average_amount`, `historical_max_amount`, `previous_failed_transactions`, `previous_fraud_count`.
- **Velocity-level**: `transactions_last_5min`, `transactions_last_10min`, `transactions_last_1hour`, `amount_last_10min`, `amount_last_1hour`.
- **Hardware-level**: `is_new_device`, `device_age_days`, `device_change_count`, `accounts_using_device`.
- **Location-level**: `distance_from_previous_transaction` (Haversine km), `location_change_frequency`, `country_change`.
- **Behavioral-level**: `amount_deviation`, `amount_zscore`, `unusual_time`, `spending_pattern_deviation`.

## 4. Supervised & Unsupervised Modeling
- **Stratified Partitioning**: 70% Train, 15% Validation, 15% Test.
- **Model Comparison**:
  - Logistic Regression (Baseline with balanced class weights)
  - Random Forest Classifier (Subsample balanced weights)
  - XGBoost Classifier (Champion model with `scale_pos_weight` and logloss optimization)
- **Unsupervised Anomaly Detection**: Isolation Forest trained on normal customer transaction manifolds to detect statistical outliers in unfamiliar multidimensional spaces.

## 5. SHAP Explainability & Risk Attribution
TreeSHAP calculates exact additive local feature contributions for every transaction prediction. Positive contributions identify risk-elevating signals, while negative contributions represent protective factors (such as established account tenure and recognized trusted devices).

## 6. AI Investigation Agent & Fallback
The AI Investigation Agent synthesizes transaction facts, SHAP factors, customer history, and network linkages into structured JSON dossiers. When an external LLM API key is not configured, the system engages a deterministic rule-and-feature-based reasoning fallback mode to ensure 100% platform availability.
