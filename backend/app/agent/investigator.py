import os
import json
import logging
import uuid
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.core.config import settings
from backend.app.models.schemas import Investigation, InvestigationResult, RiskFactor
from backend.app.agent.prompts import SYSTEM_INVESTIGATION_PROMPT, build_investigation_user_prompt

logger = logging.getLogger("riskshield.agent.investigator")


class AIAgentInvestigator:
    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.base_url = settings.LLM_BASE_URL.rstrip("/")
        self.model = settings.LLM_MODEL
        self.temperature = settings.LLM_TEMPERATURE
        self.timeout = settings.LLM_TIMEOUT_SECONDS

    async def _call_llm_api(self, user_prompt: str) -> Optional[Dict[str, Any]]:
        """Query OpenAI-compatible chat completions endpoint."""
        if not self.api_key:
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_INVESTIGATION_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": self.temperature,
            "response_format": {"type": "json_object"}
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return parsed
                else:
                    logger.warning(f"LLM API returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"LLM API call error: {e}. Falling back to deterministic analysis.")

        return None

    def _generate_deterministic_fallback(
        self,
        tx: Dict[str, Any],
        risk_score: Dict[str, Any],
        shap_factors: List[Any],
        customer_profile: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Produce a deterministic, rule-and-feature-grounded investigation report
        when an LLM API key is not supplied or fails.
        """
        score = risk_score.get("final_risk_score", 50)
        risk_level = risk_score.get("risk_level", "MEDIUM")
        amt = float(tx.get("amount", 0.0))
        curr = tx.get("currency", "INR")
        cat = tx.get("merchant_category", "ELECTRONICS")
        is_new_dev = tx.get("is_new_device", False)
        tx_10m = int(tx.get("transactions_last_10min", 1))
        hist_avg = float(customer_profile.get("historical_average_amount", tx.get("average_transaction_amount", amt)))
        acct_age = int(customer_profile.get("account_age_days", tx.get("account_age_days", 60)))

        key_findings = []
        supporting_ev = []
        conflicting_ev = []

        # Analyze amount anomaly
        if amt > hist_avg * 4:
            ratio = amt / max(1.0, hist_avg)
            finding = f"High value deviation: Transaction size (₹{amt:,.0f}) is {ratio:.1f}x higher than historical average of ₹{hist_avg:,.0f}."
            key_findings.append(finding)
            supporting_ev.append(f"Spending deviation ratio: {ratio:.1f}x baseline.")
        elif amt > hist_avg * 1.8:
            key_findings.append(f"Elevated transaction amount relative to average baseline spend of ₹{hist_avg:,.0f}.")
            supporting_ev.append(f"Amount exceeds typical mean by ₹{amt - hist_avg:,.0f}.")

        # Analyze device
        if is_new_dev:
            key_findings.append("Transaction originates from an unrecognized hardware device ID.")
            supporting_ev.append(f"Unrecognized device signature: {tx.get('device_id')}.")
        else:
            conflicting_ev.append(f"Transaction used customer's recognized hardware device ({tx.get('device_id')}).")

        # Analyze velocity
        if tx_10m >= 5:
            key_findings.append(f"Severe transaction velocity burst: {tx_10m} transactions executed within a 10-minute window.")
            supporting_ev.append(f"10-minute transaction count: {tx_10m} (threshold is 3).")
        elif tx_10m >= 3:
            key_findings.append(f"Moderate velocity cluster: {tx_10m} transactions within 10 minutes.")
            supporting_ev.append(f"Recent velocity elevated ({tx_10m} txns / 10 min).")

        # Analyze tenure
        if acct_age < 15:
            supporting_ev.append(f"Newly registered account tenure ({acct_age} days old).")
        else:
            conflicting_ev.append(f"Established customer relationship ({acct_age} days active).")

        # Top SHAP factors into evidence
        for f in shap_factors[:3]:
            f_dict = f if isinstance(f, dict) else (f.model_dump() if hasattr(f, "model_dump") else {})
            desc = f_dict.get("description", "")
            imp = f_dict.get("impact", 0.0)
            if imp > 0.05 and desc not in supporting_ev:
                supporting_ev.append(desc)
            elif imp < -0.05 and desc not in conflicting_ev:
                conflicting_ev.append(desc)

        # Action Recommendation & Summary
        if score >= 75:
            recommended_action = "HOLD"
            conf = min(0.96, 0.75 + (score / 400.0))
            req_review = True
            summary = (
                f"Transaction flagged as HIGH RISK (Score: {score}/100). "
                f"Severe risk signals detected including {', '.join(key_findings[:2]) or 'elevated fraud indicators'}. "
                f"Automated risk policy recommends placing an immediate payment hold pending analyst verification."
            )
        elif score >= 35:
            recommended_action = "REVIEW"
            conf = 0.82
            req_review = True
            summary = (
                f"Transaction classified as MEDIUM RISK (Score: {score}/100). "
                f"Moderate behavioral anomalies observed: {key_findings[0] if key_findings else 'unusual category or velocity'}. "
                f"Recommended for manual analyst inspection."
            )
        else:
            recommended_action = "APPROVE"
            conf = 0.94
            req_review = False
            summary = (
                f"Transaction evaluated as LOW RISK (Score: {score}/100). "
                f"Parameters conform closely to historical customer spending habits and device signatures. "
                f"Recommended for straight-through automated approval."
            )

        if not key_findings:
            key_findings.append("Transaction characteristics align with standard verified activity.")

        return {
            "risk_summary": summary,
            "risk_level": risk_level,
            "key_findings": key_findings,
            "supporting_evidence": supporting_ev if supporting_ev else ["No abnormal risk factors detected."],
            "conflicting_evidence": conflicting_ev if conflicting_ev else ["Standard baseline consistency."],
            "recommended_action": recommended_action,
            "confidence": round(conf, 2),
            "requires_human_review": req_review
        }

    async def investigate(
        self,
        transaction: Dict[str, Any],
        risk_score: Dict[str, Any],
        shap_factors: List[Any],
        anomaly_data: Dict[str, Any] = None,
        customer_profile: Dict[str, Any] = None,
        related_transactions: List[str] = None,
        related_devices: List[str] = None,
        related_ips: List[str] = None,
        cluster_info: Dict[str, Any] = None
    ) -> Investigation:
        """
        Execute full AI investigation for a transaction.
        Uses OpenAI-compatible endpoint when configured, or deterministic fallback.
        """
        anomaly_data = anomaly_data or {}
        customer_profile = customer_profile or {}
        related_transactions = related_transactions or []
        related_devices = related_devices or []
        related_ips = related_ips or []

        # Convert shap factors to dicts if needed
        serialized_shap = [
            f.model_dump() if hasattr(f, "model_dump") else f
            for f in shap_factors
        ]

        user_prompt = build_investigation_user_prompt(
            transaction=transaction,
            risk_score=risk_score,
            shap_factors=serialized_shap,
            anomaly_data=anomaly_data,
            customer_profile=customer_profile,
            related_transactions=related_transactions,
            cluster_info=cluster_info
        )

        is_fallback = False
        llm_output = await self._call_llm_api(user_prompt)

        if llm_output:
            try:
                # Validate with Pydantic
                validated = InvestigationResult(**llm_output)
                raw_dict = validated.model_dump()
            except Exception as e:
                logger.warning(f"LLM output schema validation failed: {e}. Utilizing fallback.")
                raw_dict = self._generate_deterministic_fallback(transaction, risk_score, serialized_shap, customer_profile)
                is_fallback = True
        else:
            raw_dict = self._generate_deterministic_fallback(transaction, risk_score, serialized_shap, customer_profile)
            is_fallback = True

        investigation_obj = Investigation(
            investigation_id=f"INV_{uuid.uuid4().hex[:10].upper()}",
            transaction_id=str(transaction.get("transaction_id")),
            risk_score=int(risk_score.get("final_risk_score", 50)),
            summary=raw_dict.get("risk_summary", ""),
            risk_factors=[RiskFactor(**f) if isinstance(f, dict) else f for f in serialized_shap],
            related_transactions=related_transactions,
            related_devices=related_devices,
            related_ips=related_ips,
            recommended_action=raw_dict.get("recommended_action", "REVIEW"),
            confidence=float(raw_dict.get("confidence", 0.85)),
            investigation_status="COMPLETED",
            key_findings=raw_dict.get("key_findings", []),
            supporting_evidence=raw_dict.get("supporting_evidence", []),
            conflicting_evidence=raw_dict.get("conflicting_evidence", []),
            requires_human_review=raw_dict.get("requires_human_review", False),
            is_fallback=is_fallback,
            created_at=datetime.now(timezone.utc)
        )

        return investigation_obj


ai_investigator = AIAgentInvestigator()
