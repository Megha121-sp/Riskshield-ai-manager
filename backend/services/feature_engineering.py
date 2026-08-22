import math
from typing import Dict, Any, List, Union
import numpy as np
import pandas as pd

# Standard categorical mappings to keep feature dimensions fixed and fast
MERCHANT_CATEGORIES = [
    "ELECTRONICS", "TRAVEL", "GAMING", "GROCERY", "LUXURY",
    "UTILITIES", "PHARMACY", "FASHION", "ENTERTAINMENT", "DINING"
]

PAYMENT_METHODS = [
    "UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET"
]

FEATURE_COLUMNS = [
    "amount",
    "merchant_category_encoded",
    "payment_method_encoded",
    "transaction_hour",
    "day_of_week",
    "account_age_days",
    "historical_transaction_count",
    "historical_average_amount",
    "historical_max_amount",
    "previous_failed_transactions",
    "previous_fraud_count",
    "transactions_last_5min",
    "transactions_last_10min",
    "transactions_last_1hour",
    "amount_last_10min",
    "amount_last_1hour",
    "is_new_device",
    "device_age_days",
    "device_change_count",
    "accounts_using_device",
    "distance_from_previous_transaction",
    "location_change_frequency",
    "country_change",
    "amount_deviation",
    "amount_zscore",
    "unusual_time",
    "spending_pattern_deviation"
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great circle distance between two points in km."""
    if lat1 == 0.0 and lon1 == 0.0:
        return 0.0
    if lat2 == 0.0 and lon2 == 0.0:
        return 0.0
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return float(R * c)


class FeaturePipeline:
    def __init__(self):
        self.feature_names = FEATURE_COLUMNS
        self.merchant_cat_map = {cat: i for i, cat in enumerate(MERCHANT_CATEGORIES)}
        self.payment_method_map = {pm: i for i, pm in enumerate(PAYMENT_METHODS)}

    def extract_features_from_dict(self, tx: Dict[str, Any], customer_profile: Dict[str, Any] = None) -> Dict[str, float]:
        """
        Extract numeric feature dictionary from a single transaction and historical context.
        """
        customer_profile = customer_profile or {}
        
        amount = float(tx.get("amount", 0.0))
        cat = str(tx.get("merchant_category", "ELECTRONICS")).upper()
        pm = str(tx.get("payment_method", "UPI")).upper()
        
        cat_encoded = float(self.merchant_cat_map.get(cat, len(self.merchant_cat_map)))
        pm_encoded = float(self.payment_method_map.get(pm, len(self.payment_method_map)))
        
        # Timestamp parsing
        ts = tx.get("timestamp")
        if isinstance(ts, str):
            try:
                ts_dt = pd.to_datetime(ts)
                hour = ts_dt.hour
                day_of_week = ts_dt.dayofweek
            except Exception:
                hour = 12
                day_of_week = 2
        elif hasattr(ts, "hour"):
            hour = ts.hour
            day_of_week = ts.weekday()
        else:
            hour = int(tx.get("transaction_hour", 12))
            day_of_week = int(tx.get("day_of_week", 2))

        # Customer features
        account_age = float(tx.get("account_age_days", customer_profile.get("account_age_days", 60)))
        hist_count = float(tx.get("previous_transaction_count", customer_profile.get("historical_transaction_count", 15)))
        hist_avg = float(tx.get("average_transaction_amount", customer_profile.get("historical_average_amount", max(100.0, amount))))
        hist_max = float(customer_profile.get("historical_max_amount", max(hist_avg * 2.5, amount)))
        prev_failed = float(customer_profile.get("previous_failed_transactions", 1 if tx.get("status") == "FAILED" else 0))
        prev_fraud = float(customer_profile.get("previous_fraud_count", 0))

        # Velocity features
        tx_5min = float(tx.get("transactions_last_5min", tx.get("transactions_last_10min", 1) // 2))
        tx_10min = float(tx.get("transactions_last_10min", 1))
        tx_1hour = float(tx.get("transactions_last_1hour", max(tx_10min, 1)))
        amt_10min = float(tx.get("amount_last_10min", amount * max(1, tx_10min)))
        amt_1hour = float(tx.get("amount_last_1hour", amount * max(1, tx_1hour)))

        # Device features
        is_new_dev = 1.0 if tx.get("is_new_device", False) else 0.0
        dev_age = float(tx.get("device_age_days", 1 if is_new_dev else 120))
        dev_change = float(tx.get("device_change_count", 2 if is_new_dev else 0))
        accounts_dev = float(tx.get("accounts_using_device", 1))

        # Location features
        prev_lat = float(customer_profile.get("last_latitude", tx.get("latitude", 19.0760)))
        prev_lon = float(customer_profile.get("last_longitude", tx.get("longitude", 72.8777)))
        curr_lat = float(tx.get("latitude", 19.0760))
        curr_lon = float(tx.get("longitude", 72.8777))
        dist_km = haversine_distance(prev_lat, prev_lon, curr_lat, curr_lon)
        if "distance_from_previous_transaction" in tx:
            dist_km = float(tx["distance_from_previous_transaction"])

        loc_freq = float(customer_profile.get("location_change_frequency", 0.05 if dist_km < 50 else 0.8))
        country_chg = 1.0 if tx.get("country", "IN") != customer_profile.get("home_country", "IN") else 0.0

        # Behavioural features
        amt_deviation = amount - hist_avg
        hist_std = float(customer_profile.get("historical_amount_std", max(hist_avg * 0.35, 50.0)))
        amt_zscore = amt_deviation / (hist_std + 1e-5)
        unusual_time = 1.0 if (1 <= hour <= 5) else 0.0
        spending_ratio = amount / (hist_avg + 1.0)

        feature_dict = {
            "amount": amount,
            "merchant_category_encoded": cat_encoded,
            "payment_method_encoded": pm_encoded,
            "transaction_hour": float(hour),
            "day_of_week": float(day_of_week),
            "account_age_days": account_age,
            "historical_transaction_count": hist_count,
            "historical_average_amount": hist_avg,
            "historical_max_amount": hist_max,
            "previous_failed_transactions": prev_failed,
            "previous_fraud_count": prev_fraud,
            "transactions_last_5min": tx_5min,
            "transactions_last_10min": tx_10min,
            "transactions_last_1hour": tx_1hour,
            "amount_last_10min": amt_10min,
            "amount_last_1hour": amt_1hour,
            "is_new_device": is_new_dev,
            "device_age_days": dev_age,
            "device_change_count": dev_change,
            "accounts_using_device": accounts_dev,
            "distance_from_previous_transaction": dist_km,
            "location_change_frequency": loc_freq,
            "country_change": country_chg,
            "amount_deviation": amt_deviation,
            "amount_zscore": amt_zscore,
            "unusual_time": unusual_time,
            "spending_pattern_deviation": spending_ratio
        }

        return feature_dict

    def transform_single(self, tx: Dict[str, Any], customer_profile: Dict[str, Any] = None) -> pd.DataFrame:
        """Return a 1-row DataFrame aligned with FEATURE_COLUMNS."""
        fdict = self.extract_features_from_dict(tx, customer_profile)
        return pd.DataFrame([fdict])[self.feature_names]

    def transform_batch(self, df_or_list: Union[pd.DataFrame, List[Dict[str, Any]]]) -> pd.DataFrame:
        """Transform a batch of transactions into feature DataFrame."""
        if isinstance(df_or_list, pd.DataFrame):
            tx_list = df_or_list.to_dict(orient="records")
        else:
            tx_list = df_or_list

        features = [self.extract_features_from_dict(tx) for tx in tx_list]
        return pd.DataFrame(features)[self.feature_names]


feature_pipeline = FeaturePipeline()
