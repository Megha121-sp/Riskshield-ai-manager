import logging
from typing import List, Dict, Any
import numpy as np
import pandas as pd
from backend.ml.model_loader import model_store
from backend.services.feature_engineering import FEATURE_COLUMNS
from backend.app.models.schemas import RiskFactor

logger = logging.getLogger("riskshield.ml.explainability")

HUMAN_FACTOR_TEMPLATES = {
    "amount_deviation": lambda val, imp: (
        f"Amount is ₹{val:,.0f} higher than user baseline" if val > 0
        else f"Amount is ₹{abs(val):,.0f} within expected baseline"
    ),
    "amount_zscore": lambda val, imp: (
        f"Transaction size is {val:.1f} standard deviations above normal" if val > 2.0
        else f"Transaction size matches regular statistical profile ({val:.1f} std)"
    ),
    "is_new_device": lambda val, imp: (
        "Transaction initiated from an unrecognized / new device" if val > 0.5
        else "Recognized trusted user hardware"
    ),
    "transactions_last_10min": lambda val, imp: (
        f"High transaction burst velocity ({int(val)} transactions in 10 mins)" if val > 2
        else f"Normal transaction frequency ({int(val)} txn in 10 mins)"
    ),
    "transactions_last_5min": lambda val, imp: (
        f"Rapid-fire burst ({int(val)} transactions within 5 mins)" if val > 1
        else "Normal 5-min velocity"
    ),
    "amount_last_1hour": lambda val, imp: (
        f"High 1-hour cumulative volume (₹{val:,.0f})" if val > 10000
        else "Normal hourly volume"
    ),
    "distance_from_previous_transaction": lambda val, imp: (
        f"Location jump of {val:,.0f} km from last known activity" if val > 100
        else f"Transaction within expected local perimeter ({val:.1f} km)"
    ),
    "country_change": lambda val, imp: (
        "Cross-border transaction outside domestic account country" if val > 0.5
        else "Domestic home-country transaction"
    ),
    "unusual_time": lambda val, imp: (
        "Transaction executed during abnormal night hours (1:00 AM - 5:00 AM)" if val > 0.5
        else "Transaction occurred during standard daytime hours"
    ),
    "account_age_days": lambda val, imp: (
        f"Brand new account ({int(val)} days old) with immediate high volume" if val < 10
        else f"Mature account tenure ({int(val)} days)"
    ),
    "previous_failed_transactions": lambda val, imp: (
        f"Multiple preceding authorization failures ({int(val)} failed)" if val > 0
        else "Zero recent authorization failures"
    ),
    "accounts_using_device": lambda val, imp: (
        f"Device linked to {int(val)} distinct customer accounts (syndicate indicator)" if val > 1
        else "Exclusive single-user device"
    ),
    "spending_pattern_deviation": lambda val, imp: (
        f"Spend magnitude is {val:.1f}x historical average" if val > 2.5
        else f"Spend magnitude aligned with usual habits ({val:.1f}x)"
    ),
    "merchant_category_encoded": lambda val, imp: (
        "High-risk high-velocity merchant category (Electronics / Luxury / Gaming)" if imp > 0
        else "Standard merchant category"
    ),
    "payment_method_encoded": lambda val, imp: (
        "Payment channel risk profile impact"
    )
}


def explain_transaction_shap(features_df: pd.DataFrame, top_k: int = 5) -> List[RiskFactor]:
    """
    Compute SHAP values for a single transaction row and format human-readable factor objects.
    """
    if not model_store.is_loaded:
        model_store.load_models()

    row_features = features_df[FEATURE_COLUMNS].iloc[0].to_dict()

    # Try TreeSHAP computation
    if model_store.shap_explainer is not None:
        try:
            X = features_df[FEATURE_COLUMNS]
            shap_values = model_store.shap_explainer.shap_values(X)
            # For binary classification TreeExplainer, shap_values can be array or list
            if isinstance(shap_values, list):
                sv = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
            elif isinstance(shap_values, np.ndarray) and len(shap_values.shape) == 2:
                sv = shap_values[0]
            else:
                sv = np.array(shap_values).flatten()

            factors = []
            for col, val, imp in zip(FEATURE_COLUMNS, X.values[0], sv):
                impact_float = float(imp)
                desc_func = HUMAN_FACTOR_TEMPLATES.get(
                    col,
                    lambda v, i: f"Factor {col} value={v} (impact {i:+.3f})"
                )
                desc = desc_func(val, impact_float)

                factors.append(RiskFactor(
                    feature=col,
                    impact=round(impact_float, 4),
                    description=desc,
                    value=round(float(val), 2) if isinstance(val, (int, float, np.number)) else str(val)
                ))

            # Sort by absolute impact magnitude
            factors.sort(key=lambda x: abs(x.impact), reverse=True)
            return factors[:top_k]
        except Exception as e:
            logger.warning(f"TreeSHAP calculation fallback: {e}")

    # Heuristic SHAP approximation fallback
    factors = []
    amt_z = float(row_features.get("amount_zscore", 0.0))
    if amt_z > 2.0:
        factors.append(RiskFactor(
            feature="amount_zscore",
            impact=round(0.25 + (amt_z * 0.05), 3),
            description=f"Transaction amount is {amt_z:.1f} standard deviations above historical mean",
            value=round(amt_z, 2)
        ))

    is_new = float(row_features.get("is_new_device", 0.0))
    if is_new > 0.5:
        factors.append(RiskFactor(
            feature="is_new_device",
            impact=0.22,
            description="Transaction originated from an unrecognized hardware device",
            value=1
        ))

    tx_10 = float(row_features.get("transactions_last_10min", 1.0))
    if tx_10 > 2.0:
        factors.append(RiskFactor(
            feature="transactions_last_10min",
            impact=round(0.15 + (tx_10 * 0.03), 3),
            description=f"High frequency velocity spike ({int(tx_10)} transactions within 10 minutes)",
            value=int(tx_10)
        ))

    dist = float(row_features.get("distance_from_previous_transaction", 0.0))
    if dist > 300.0:
        factors.append(RiskFactor(
            feature="distance_from_previous_transaction",
            impact=round(0.18, 3),
            description=f"Unusual geographical jump ({dist:,.0f} km from previous recorded location)",
            value=round(dist, 1)
        ))

    # Add negative/protective factor if legitimate
    if len(factors) < top_k:
        acct_age = float(row_features.get("account_age_days", 60.0))
        if acct_age > 100:
            factors.append(RiskFactor(
                feature="account_age_days",
                impact=-0.14,
                description=f"Established trusted account history ({int(acct_age)} days tenure)",
                value=int(acct_age)
            ))

    return factors[:top_k]
