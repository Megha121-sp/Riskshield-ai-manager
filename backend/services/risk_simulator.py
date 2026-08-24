import logging
from typing import Dict, Any, List, Optional
import copy

from backend.services.risk_engine import risk_engine
from backend.services.feature_engineering import feature_pipeline

logger = logging.getLogger("riskshield.services.risk_simulator")


class RiskSimulatorService:
    """
    Evaluates what-if counterfactual scenarios by perturbing transaction attributes
    and re-running the exact risk engine without modifying the underlying database.
    """

    def simulate_counterfactual(
        self,
        base_tx: Dict[str, Any],
        overrides: Dict[str, Any],
        customer_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run risk engine on a perturbed transaction.
        """
        # Create non-destructive deep copy
        sim_tx = copy.deepcopy(base_tx)

        # Apply analyst overrides
        for k, v in overrides.items():
            if v is not None:
                sim_tx[k] = v

        # Calculate original score if not present
        orig_score_obj = risk_engine.score_transaction(base_tx, customer_profile)
        # Calculate simulated score
        sim_score_obj = risk_engine.score_transaction(sim_tx, customer_profile)

        orig_dict = orig_score_obj.model_dump()
        sim_dict = sim_score_obj.model_dump()

        score_delta = sim_dict["final_risk_score"] - orig_dict["final_risk_score"]

        # Recommendation for simulated score
        sim_score = sim_dict["final_risk_score"]
        if sim_score <= 30:
            sim_rec = "APPROVE"
        elif sim_score <= 70:
            sim_rec = "REVIEW"
        else:
            sim_rec = "HOLD"

        return {
            "transaction_id": base_tx.get("transaction_id"),
            "original": {
                "risk_score": orig_dict["final_risk_score"],
                "risk_level": orig_dict["risk_level"],
                "fraud_probability": orig_dict["fraud_probability"],
                "anomaly_score": orig_dict["anomaly_score"],
                "velocity_score": orig_dict["velocity_score"],
                "behavioural_score": orig_dict["behavioural_score"],
                "device_score": orig_dict["device_score"],
                "recommendation": "HOLD" if orig_dict["final_risk_score"] > 70 else ("REVIEW" if orig_dict["final_risk_score"] > 30 else "APPROVE")
            },
            "simulated": {
                "risk_score": sim_dict["final_risk_score"],
                "risk_level": sim_dict["risk_level"],
                "fraud_probability": sim_dict["fraud_probability"],
                "anomaly_score": sim_dict["anomaly_score"],
                "velocity_score": sim_dict["velocity_score"],
                "behavioural_score": sim_dict["behavioural_score"],
                "device_score": sim_dict["device_score"],
                "top_factors": sim_dict["top_risk_factors"][:4],
                "recommendation": sim_rec
            },
            "score_delta": score_delta,
            "applied_overrides": overrides,
            "is_counterfactual": True,
            "disclaimer": "Estimated Counterfactual Simulation - Database Unaltered"
        }

    def generate_counterfactual_reductions(
        self,
        base_tx: Dict[str, Any],
        customer_profile: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Compute 'What Would Reduce the Risk?' explanations for high/medium risk transactions.
        """
        orig_score_obj = risk_engine.score_transaction(base_tx, customer_profile)
        orig_score = orig_score_obj.final_risk_score

        reductions = []

        # 1. Counterfactual: Recognized Device
        if base_tx.get("is_new_device", False):
            sim = self.simulate_counterfactual(base_tx, {"is_new_device": False}, customer_profile)
            new_s = sim["simulated"]["risk_score"]
            reductions.append({
                "condition": "If device were recognized and bound to account",
                "original_score": orig_score,
                "simulated_score": new_s,
                "delta": new_s - orig_score,
                "new_level": sim["simulated"]["risk_level"],
                "new_action": sim["simulated"]["recommendation"]
            })

        # 2. Counterfactual: Amount within historical average
        avg_amt = float(base_tx.get("average_transaction_amount", 1500.0)) or 1500.0
        cur_amt = float(base_tx.get("amount", 0.0))
        if cur_amt > avg_amt * 2.0:
            sim = self.simulate_counterfactual(base_tx, {"amount": avg_amt}, customer_profile)
            new_s = sim["simulated"]["risk_score"]
            reductions.append({
                "condition": f"If transaction amount were within baseline average (₹{avg_amt:,.2f})",
                "original_score": orig_score,
                "simulated_score": new_s,
                "delta": new_s - orig_score,
                "new_level": sim["simulated"]["risk_level"],
                "new_action": sim["simulated"]["recommendation"]
            })

        # 3. Counterfactual: Normal velocity (single transaction)
        if base_tx.get("transactions_last_10min", 1) > 1:
            sim = self.simulate_counterfactual(base_tx, {"transactions_last_10min": 1, "transactions_last_1hour": 1}, customer_profile)
            new_s = sim["simulated"]["risk_score"]
            reductions.append({
                "condition": "If velocity were normal (1 transaction in 10 minutes)",
                "original_score": orig_score,
                "simulated_score": new_s,
                "delta": new_s - orig_score,
                "new_level": sim["simulated"]["risk_level"],
                "new_action": sim["simulated"]["recommendation"]
            })

        # 4. Counterfactual: Combined clean context
        sim_combined = self.simulate_counterfactual(
            base_tx,
            {
                "is_new_device": False,
                "amount": avg_amt,
                "transactions_last_10min": 1,
                "country": "IN"
            },
            customer_profile
        )
        new_s = sim_combined["simulated"]["risk_score"]
        reductions.append({
            "condition": "If all behavioral, hardware, and velocity signals were normal",
            "original_score": orig_score,
            "simulated_score": new_s,
            "delta": new_s - orig_score,
            "new_level": sim_combined["simulated"]["risk_level"],
            "new_action": sim_combined["simulated"]["recommendation"]
        })

        return reductions


risk_simulator = RiskSimulatorService()
