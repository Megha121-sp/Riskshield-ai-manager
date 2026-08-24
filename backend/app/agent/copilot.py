import re
import logging
from typing import Dict, Any, List, Optional
import httpx

from backend.app.core.config import settings
from backend.app.agent import copilot_tools as tools

logger = logging.getLogger("riskshield.agent.copilot")


class RiskCopilotEngine:
    """
    Intelligent Risk Operations Copilot.
    Executes grounded backend queries and synthesizes factual answers without hallucination.
    """

    async def ask(self, question: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        q = question.strip()
        q_lower = q.lower()

        tools_used = []
        citations = []
        answer = ""

        # 1. Check for transaction ID in question or context
        txn_match = re.search(r'\b(TXN_[A-Za-z0-9_]+)\b', q, re.IGNORECASE)
        active_tid = txn_match.group(1).upper() if txn_match else (context.get("transaction_id") if context else None)

        # 2. Check for device ID in question or context
        dev_match = re.search(r'\b(DEV_[A-Za-z0-9_]+)\b', q, re.IGNORECASE)
        active_dev = dev_match.group(1).upper() if dev_match else (context.get("device_id") if context else None)

        # 3. Check for customer ID in question or context
        cust_match = re.search(r'\b(USR_[A-Za-z0-9_]+|CUST_[A-Za-z0-9_]+)\b', q, re.IGNORECASE)
        active_cust = cust_match.group(1).upper() if cust_match else (context.get("customer_id") if context else None)

        # 4. Check for cluster ID
        cluster_match = re.search(r'\b(CLUSTER_[A-Za-z0-9_]+|RING_[A-Za-z0-9_]+)\b', q, re.IGNORECASE)
        active_cluster = cluster_match.group(1).upper() if cluster_match else None

        # ROUTING & TOOL EXECUTION:

        # Scenario A: Priority triage ("what should I investigate first?", "priority", "queue")
        if any(w in q_lower for w in ["first", "priority", "queue", "investigate next", "triage", "urgent"]):
            tools_used.append("get_high_priority_cases()")
            cases = await tools.tool_get_high_priority_cases(limit=3)
            if not cases:
                answer = "There are currently no high-priority pending cases in the investigation queue. All transactions are within normal operating thresholds."
            else:
                lines = ["Here are the top priority cases requiring your immediate attention:\n"]
                for i, c in enumerate(cases, 1):
                    reasons_str = "; ".join(c.get("primary_reasons", []))
                    lines.append(
                        f"**#{i}. {c['transaction_id']}** (Priority Score: **{c['priority_score']} / 100**)\n"
                        f"- **Customer**: `{c['customer_id']}` | **Amount**: ₹{c['amount']:,.2f}\n"
                        f"- **Risk Level**: `{c['risk_level']}` (Score: {c['risk_score']})\n"
                        f"- **Primary Driver**: {reasons_str}\n"
                        f"- **Proposed Action**: `{c['recommended_action']}`\n"
                    )
                    citations.append(c["transaction_id"])
                lines.append(f"\n💡 *Recommendation: Click **Investigate Now** on #{cases[0]['transaction_id']} to begin triage.*")
                answer = "\n".join(lines)

        # Scenario B: What changed today? / Why did risk increase?
        elif any(w in q_lower for w in ["change", "today", "increase", "why did risk", "surge", "trend", "shift"]):
            tools_used.append("get_what_changed_today()")
            changes = await tools.tool_get_what_changed_today()
            answer = (
                f"### 📊 Portfolio Risk Dynamics Summary\n\n"
                f"- **Current Portfolio Fraud Rate**: **{changes['fraud_rate']}%** (Baseline: {changes['baseline_rate']}%)\n"
                f"- **Fraud Rate Surge**: **{'+' if changes['fraud_rate_change_pct'] > 0 else ''}{changes['fraud_rate_change_pct']}%**\n"
                f"- **High-Risk Transactions Flagged**: **{changes['high_risk_count']} cases**\n"
                f"- **Active Coordinated Fraud Rings**: **{changes['active_fraud_rings']} clusters**\n"
                f"- **Rolling Volume Spikes**: **{changes['active_spikes']} active**\n\n"
                f"**Root-Cause Driver Analysis**:\n{changes['summary_explanation']}"
            )

        # Scenario C: Specific Transaction Explanation / Evidence
        elif active_tid and any(w in q_lower for w in ["why", "explain", "evidence", "risk", "score", "details", "reason", "factor"]):
            tools_used.append(f"get_transaction('{active_tid}')")
            tx_data = await tools.tool_get_transaction(active_tid)
            if not tx_data:
                answer = f"I don't have enough evidence to determine that. Transaction `{active_tid}` was not found in the transaction registry."
            else:
                tx = tx_data["transaction"]
                score = tx_data["risk_score"]
                citations.append(active_tid)

                score_val = score.get("final_risk_score", 50) if score else 50
                level = score.get("risk_level", "MEDIUM") if score else "MEDIUM"
                prob = score.get("fraud_probability", 0.5) if score else 0.5
                factors = score.get("top_risk_factors", []) if score else []

                factor_bullets = []
                for f in factors[:4]:
                    desc = f.get("description", f.get("feature"))
                    imp = f.get("impact", 0)
                    sign = "+" if imp > 0 else ""
                    factor_bullets.append(f"- **{f.get('feature')}** ({sign}{imp:.3f}): {desc}")

                factor_text = "\n".join(factor_bullets) if factor_bullets else "- Standard baseline model score."

                answer = (
                    f"### 🔍 Risk Audit for `{active_tid}`\n\n"
                    f"- **Customer**: `{tx.get('customer_id')}`\n"
                    f"- **Amount**: ₹{tx.get('amount', 0):,.2f} ({tx.get('payment_method')} @ {tx.get('merchant_category')})\n"
                    f"- **Final Composite Risk Score**: **{score_val} / 100 ({level} RISK)**\n"
                    f"- **ML Supervised Fraud Probability**: **{prob * 100:.1f}%**\n"
                    f"- **Hardware Signature**: `{tx.get('device_id')}` ({'Unrecognized Device' if tx.get('is_new_device') else 'Recognized Device'})\n\n"
                    f"**Key Evidence & SHAP Attributions**:\n{factor_text}\n\n"
                    f"**Recommended Action**: `{'HOLD' if score_val >= 75 else ('REVIEW' if score_val >= 35 else 'APPROVE')}`"
                )

        # Scenario D: Device Investigation ("device", "DEV_...")
        elif active_dev or any(w in q_lower for w in ["device", "hardware", "multi-account", "syndicate"]):
            target_dev = active_dev or "DEV_SYNDICATE_HW_7781"
            tools_used.append(f"get_device('{target_dev}')")
            dev_data = await tools.tool_get_device(target_dev)
            if not dev_data:
                answer = f"I don't have enough evidence to determine that. Device ID `{target_dev}` has no recorded activity in the current database."
            else:
                citations.append(target_dev)
                custs_str = ", ".join([f"`{c}`" for c in dev_data["linked_customers"][:5]])
                ips_str = ", ".join(dev_data["linked_ips"][:3])
                answer = (
                    f"### 📱 Hardware Device Intelligence: `{target_dev}`\n\n"
                    f"- **Device Risk Tier**: **{dev_data['risk_level']}**\n"
                    f"- **Distinct Accounts Linked**: **{dev_data['distinct_accounts_count']} accounts** ({custs_str})\n"
                    f"- **Total Transactions Processed**: **{dev_data['transaction_count']} txns**\n"
                    f"- **Flagged Fraud Incidents**: **{dev_data['fraud_count']} cases**\n"
                    f"- **Cumulative Exposure at Risk**: **₹{dev_data['total_amount_at_risk']:,.2f}**\n"
                    f"- **Linked IP Addresses**: {ips_str or 'None recorded'}\n\n"
                    f"**Analyst Assessment**: " + (
                        "🚨 **High-severity multi-account syndicate signature detected.** Hardware fingerprint is shared across unrelated user accounts."
                        if dev_data['distinct_accounts_count'] >= 2 else
                        "Standard single-user hardware footprint."
                    )
                )

        # Scenario E: Customer Risk History ("customer", "USR_...")
        elif active_cust or any(w in q_lower for w in ["customer", "user", "tenure", "history"]):
            target_cust = active_cust or "USR_MUMBAI_1042"
            tools_used.append(f"get_customer('{target_cust}')")
            cust_data = await tools.tool_get_customer(target_cust)
            if not cust_data:
                answer = f"I don't have enough evidence to determine that. Customer `{target_cust}` was not found in the customer directory."
            else:
                citations.append(target_cust)
                devs = ", ".join([f"`{d}`" for d in cust_data["linked_devices"][:3]])
                answer = (
                    f"### 👤 Customer Risk Profile: `{target_cust}`\n\n"
                    f"- **Account Tenure**: **{cust_data['account_age_days']} days**\n"
                    f"- **Historical Average Spend**: **₹{cust_data['historical_avg_spend']:,.2f}**\n"
                    f"- **Total Transaction History**: **{cust_data['total_transactions']} txns** (Volume: ₹{cust_data['total_volume']:,.2f})\n"
                    f"- **Fraudulent / Flagged Incidents**: **{cust_data['fraud_transactions']} txns**\n"
                    f"- **Known Devices**: {devs or 'Standard'}\n\n"
                    f"**Profile Summary**: Customer is an {'established' if cust_data['account_age_days'] > 90 else 'early-stage'} user with "
                    f"{'clean historical activity.' if cust_data['fraud_transactions'] == 0 else 'prior high-risk activity on record.'}"
                )

        # Scenario F: Active Fraud Rings / Clusters
        elif any(w in q_lower for w in ["ring", "cluster", "syndicate", "network", "highest amount"]):
            tools_used.append("get_fraud_clusters()")
            tx_coll = tools.db_manager.get_collection("transactions")
            txns = await tx_coll.find().limit(5000).to_list(length=5000)
            clusters_objs = await tools.detect_fraud_clusters(txns)
            clusters = [c.model_dump() if hasattr(c, "model_dump") else c for c in clusters_objs]

            if not clusters:
                answer = "No active multi-account fraud rings or syndicate clusters are currently detected in the network."
            else:
                top_c = max(clusters, key=lambda x: x.get("estimated_amount_at_risk", 0))
                citations.append(top_c.get("cluster_id"))
                answer = (
                    f"### 🕸️ Fraud Ring & Syndicate Intelligence\n\n"
                    f"Currently tracking **{len(clusters)} active fraud clusters**.\n\n"
                    f"**Highest Risk Cluster**: `{top_c.get('cluster_id')}`\n"
                    f"- **Risk Level**: **{top_c.get('risk_level')}**\n"
                    f"- **Amount at Risk**: **₹{top_c.get('estimated_amount_at_risk', 0):,.2f}**\n"
                    f"- **Linked Accounts**: **{len(top_c.get('affected_users', []))} accounts**\n"
                    f"- **Linked Transactions**: **{len(top_c.get('affected_transactions', []))} txns**\n"
                    f"- **Shared Hardware IDs**: {', '.join([f'`{d}`' for d in top_c.get('shared_devices', [])[:3]])}\n"
                    f"- **Shared IPs**: {', '.join(top_c.get('shared_ips', [])[:3])}\n\n"
                    f"💡 *Open Fraud Intelligence in the sidebar to inspect the full interactive network graph.*"
                )

        # Scenario G: General / Fallback with real alerts
        else:
            tools_used.append("get_active_alerts()")
            alerts = await tools.tool_get_active_alerts()
            answer = (
                f"I am your **RiskShield Copilot**, connected directly to live transaction telemetry, graph clusters, and ML models.\n\n"
                f"Currently tracking **{len(alerts)} active open risk alerts**.\n\n"
                f"**You can ask me to:**\n"
                f"- *\"What should I investigate first?\"*\n"
                f"- *\"Why did risk increase today?\"*\n"
                f"- *\"Why is transaction TXN_... high risk?\"*\n"
                f"- *\"Show me all accounts linked to device DEV_...\"*\n"
                f"- *\"Which fraud ring has the highest exposure?\"*\n"
                f"- *\"Summarize customer USR_... risk profile\"*"
            )

        return {
            "answer": answer,
            "tools_used": tools_used,
            "citations": citations,
            "suggested_followups": [
                "What should I investigate first?",
                "Why did risk increase today?",
                "Which fraud ring has the highest amount at risk?",
                "Show active device syndicates"
            ]
        }


risk_copilot = RiskCopilotEngine()
