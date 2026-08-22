SYSTEM_INVESTIGATION_PROMPT = """You are RISKSHIELD AI, an expert Senior Payment Risk & Fraud Intelligence Agent.
Your role is to analyze a suspicious payment transaction using the factual signals, SHAP explainability factors, anomaly indicators, and customer behavioral profile provided to you.

STRICT SAFETY & FACTUAL INTEGRITY RULES:
1. ONLY reference and use the facts, numbers, devices, locations, and signals provided in the context.
2. DO NOT hallucinate or invent customer identities, historical spending patterns, locations, or bank results not present in the input.
3. If evidence is sparse or ambiguous, state: "Insufficient evidence for a confident conclusion."
4. DO NOT authorize financial execution directly; provide a structured analytical recommendation for human analysts.

You must output a single valid JSON object adhering strictly to this schema:
{
  "risk_summary": "<A concise 2-3 sentence executive summary explaining the core risk profile>",
  "risk_level": "<LOW | MEDIUM | HIGH>",
  "key_findings": [
    "<Key finding 1>",
    "<Key finding 2>",
    "<Key finding 3>"
  ],
  "supporting_evidence": [
    "<Concrete data point 1 that elevates risk>",
    "<Concrete data point 2 that elevates risk>"
  ],
  "conflicting_evidence": [
    "<Legitimate signals or account tenure factors that reduce risk, or empty array if none>"
  ],
  "recommended_action": "<APPROVE | REVIEW | HOLD | ESCALATE>",
  "confidence": <Float between 0.50 and 0.99>,
  "requires_human_review": <true | false>
}

Action Rules:
- If risk_level is HIGH (risk score > 70) or critical fraud patterns are detected, recommend HOLD or ESCALATE with requires_human_review=true.
- If risk_level is MEDIUM (31-70), recommend REVIEW with requires_human_review=true.
- If risk_level is LOW (0-30), recommend APPROVE with requires_human_review=false.
"""


def build_investigation_user_prompt(
    transaction: dict,
    risk_score: dict,
    shap_factors: list,
    anomaly_data: dict,
    customer_profile: dict,
    related_transactions: list,
    cluster_info: dict = None
) -> str:
    factors_text = "\n".join([
        f"  - {f.get('feature')}: impact={f.get('impact')} | description={f.get('description')} | value={f.get('value')}"
        for f in shap_factors
    ])

    return f"""Please investigate the following payment transaction:

=== TRANSACTION CONTEXT ===
Transaction ID: {transaction.get('transaction_id')}
Amount: {transaction.get('currency', 'INR')} {transaction.get('amount', 0):,.2f}
Timestamp: {transaction.get('timestamp')}
Payment Method: {transaction.get('payment_method')}
Merchant: {transaction.get('merchant_id')} ({transaction.get('merchant_category')})
Device ID: {transaction.get('device_id')} (Is New Device: {transaction.get('is_new_device')})
IP Address: {transaction.get('ip_address')}
Location: Country={transaction.get('country')}, Lat={transaction.get('latitude')}, Lon={transaction.get('longitude')}
Status: {transaction.get('status')}

=== RISK ENGINE & ML SIGNALS ===
Composite Risk Score: {risk_score.get('final_risk_score')}/100 ({risk_score.get('risk_level')})
Supervised Fraud Probability: {risk_score.get('fraud_probability')}
Isolation Forest Anomaly Score: {risk_score.get('anomaly_score')}
Velocity Score: {risk_score.get('velocity_score')}
Behavioural Score: {risk_score.get('behavioural_score')}
Device Score: {risk_score.get('device_score')}
Location Score: {risk_score.get('location_score')}

=== TOP SHAP RISK FACTORS ===
{factors_text if factors_text else '  - No major SHAP deviations detected.'}

=== CUSTOMER PROFILE & HISTORY ===
Customer ID: {customer_profile.get('customer_id', transaction.get('customer_id'))}
Account Age: {customer_profile.get('account_age_days', transaction.get('account_age_days', 60))} days
Historical Avg Spend: ₹{customer_profile.get('historical_average_amount', transaction.get('average_transaction_amount', 1500)):,.2f}
Historical Max Spend: ₹{customer_profile.get('historical_max_amount', 5000):,.2f}
Previous Txn Count: {customer_profile.get('historical_transaction_count', transaction.get('previous_transaction_count', 10))}
Recent Failed Attempts: {customer_profile.get('previous_failed_transactions', 0)}

=== VELOCITY & NETWORK ACTIVITY ===
Transactions in last 10 min: {transaction.get('transactions_last_10min', 1)}
Transactions in last 1 hour: {transaction.get('transactions_last_1hour', 1)}
Related Transactions in window: {len(related_transactions)}
Cluster Association: {cluster_info.get('cluster_id') if cluster_info else 'None detected'}

Analyze the evidence carefully and output your JSON investigation report.
"""
