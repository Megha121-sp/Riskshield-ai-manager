import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix
)
import xgboost as xgb
import shap

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.services.feature_engineering import feature_pipeline, FEATURE_COLUMNS

FEATURE_DESCRIPTIONS = {
    "amount": "Transaction amount in INR",
    "merchant_category_encoded": "Categorical code for merchant sector",
    "payment_method_encoded": "Payment method type (UPI, Card, etc.)",
    "transaction_hour": "Time of day (0-23)",
    "day_of_week": "Day of week (0=Mon, 6=Sun)",
    "account_age_days": "Customer account age in days",
    "historical_transaction_count": "Total prior transactions by customer",
    "historical_average_amount": "Customer historical mean spend",
    "historical_max_amount": "Customer highest recorded transaction",
    "previous_failed_transactions": "Number of recent failed attempts",
    "previous_fraud_count": "Prior confirmed fraudulent incidents",
    "transactions_last_5min": "Short-term burst transaction velocity (5 min)",
    "transactions_last_10min": "Medium-term burst transaction velocity (10 min)",
    "transactions_last_1hour": "Hourly transaction velocity",
    "amount_last_10min": "Cumulative transaction volume in past 10 min",
    "amount_last_1hour": "Cumulative transaction volume in past 1 hour",
    "is_new_device": "Transaction originated from an unrecognized device",
    "device_age_days": "Number of days this device has been associated with account",
    "device_change_count": "Frequency of device switching by customer",
    "accounts_using_device": "Number of distinct accounts sharing this device",
    "distance_from_previous_transaction": "Haversine distance (km) from last known transaction",
    "location_change_frequency": "Rate of geographical movement across sessions",
    "country_change": "Transaction originated outside home country",
    "amount_deviation": "Difference between current amount and user average spend",
    "amount_zscore": "Standard deviations from user mean spend",
    "unusual_time": "Transaction executed during off-peak hours (1 AM - 5 AM)",
    "spending_pattern_deviation": "Ratio of current transaction to historical average"
}


def train_and_evaluate_all():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    data_dir = os.path.join(base_dir, "ml", "data")
    models_dir = os.path.join(base_dir, "ml", "models")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(data_dir, exist_ok=True)

    data_file = os.path.join(data_dir, "demo_transactions.json")
    if not os.path.exists(data_file):
        from backend.scripts.generate_data import save_and_seed_data
        save_and_seed_data(data_dir)

    print("Loading synthetic dataset for model training...", flush=True)
    with open(data_file, "r", encoding="utf-8") as f:
        raw_txns = json.load(f)

    print(f"Loaded {len(raw_txns)} transactions.", flush=True)
    df_features = feature_pipeline.transform_batch(raw_txns)
    y = np.array([tx.get("is_fraud", 0) for tx in raw_txns])

    X = df_features[FEATURE_COLUMNS]

    # Stratified Split: 70% Train, 15% Validation, 15% Test
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    val_ratio_adjusted = 0.15 / 0.85
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=val_ratio_adjusted, random_state=42, stratify=y_train_val
    )

    print(f"Dataset split -> Train: {len(X_train)} ({y_train.sum()} fraud), Val: {len(X_val)} ({y_val.sum()} fraud), Test: {len(X_test)} ({y_test.sum()} fraud)", flush=True)

    # Standard Scaler for Linear Model
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # 1. MODEL 1: Logistic Regression (Baseline)
    print("\n--- Training Model 1: Logistic Regression Baseline ---", flush=True)
    lr = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    lr.fit(X_train_scaled, y_train)

    # 2. MODEL 2: Random Forest
    print("--- Training Model 2: Random Forest Classifier ---", flush=True)
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=1
    )
    rf.fit(X_train, y_train)

    # 3. MODEL 3: XGBoost Classifier
    print("--- Training Model 3: XGBoost Classifier ---", flush=True)
    fraud_weight = float((len(y_train) - y_train.sum()) / max(1, y_train.sum()))
    xgb_model = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.08,
        scale_pos_weight=fraud_weight,
        subsample=0.85,
        colsample_bytree=0.85,
        eval_metric="logloss",
        random_state=42,
        n_jobs=1
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )

    # 4. ANOMALY DETECTION: Isolation Forest
    print("--- Training Anomaly Detector: Isolation Forest ---", flush=True)
    X_normal = X_train[y_train == 0]
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.06,
        random_state=42,
        n_jobs=1
    )
    iso_forest.fit(X_normal)

    # Evaluation function
    def evaluate(model, X_eval, y_eval, is_scaled=False):
        features = X_eval if not is_scaled else scaler.transform(X_eval)
        preds_prob = model.predict_proba(features)[:, 1]
        preds_binary = (preds_prob >= 0.5).astype(int)

        prec = float(precision_score(y_eval, preds_binary, zero_division=0))
        rec = float(recall_score(y_eval, preds_binary, zero_division=0))
        f1 = float(f1_score(y_eval, preds_binary, zero_division=0))
        roc = float(roc_auc_score(y_eval, preds_prob))
        pr_auc = float(average_precision_score(y_eval, preds_prob))

        cm = confusion_matrix(y_eval, preds_binary)
        tn, fp, fn, tp = cm.ravel()
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0

        return {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "roc_auc": round(roc, 4),
            "pr_auc": round(pr_auc, 4),
            "fpr": round(fpr, 4),
            "confusion_matrix": {
                "true_negative": int(tn),
                "false_positive": int(fp),
                "false_negative": int(fn),
                "true_positive": int(tp)
            }
        }

    # Evaluate on held-out test set
    lr_metrics = evaluate(lr, X_test, y_test, is_scaled=True)
    rf_metrics = evaluate(rf, X_test, y_test, is_scaled=False)
    xgb_metrics = evaluate(xgb_model, X_test, y_test, is_scaled=False)

    print("\n--- FINAL TEST EVALUATION RESULTS ---", flush=True)
    print(f"Logistic Regression: F1={lr_metrics['f1_score']}, ROC-AUC={lr_metrics['roc_auc']}, PR-AUC={lr_metrics['pr_auc']}, FPR={lr_metrics['fpr']}", flush=True)
    print(f"Random Forest:       F1={rf_metrics['f1_score']}, ROC-AUC={rf_metrics['roc_auc']}, PR-AUC={rf_metrics['pr_auc']}, FPR={rf_metrics['fpr']}", flush=True)
    print(f"XGBoost Classifier:  F1={xgb_metrics['f1_score']}, ROC-AUC={xgb_metrics['roc_auc']}, PR-AUC={xgb_metrics['pr_auc']}, FPR={xgb_metrics['fpr']}", flush=True)

    # Feature Importance from XGBoost
    importances = xgb_model.feature_importances_
    feat_imp = [
        {
            "feature": col,
            "importance": round(float(imp), 4),
            "description": FEATURE_DESCRIPTIONS.get(col, col)
        }
        for col, imp in zip(FEATURE_COLUMNS, importances)
    ]
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)

    # Fit SHAP Explainer
    print("\nFitting SHAP TreeExplainer for real-time explainability...", flush=True)
    explainer = shap.TreeExplainer(xgb_model)

    # Save Model Artifacts
    print("Saving model artifacts...", flush=True)
    joblib.dump(xgb_model, os.path.join(models_dir, "risk_model.joblib"))
    joblib.dump(iso_forest, os.path.join(models_dir, "anomaly_model.joblib"))
    joblib.dump(lr, os.path.join(models_dir, "baseline_lr.joblib"))
    joblib.dump(rf, os.path.join(models_dir, "baseline_rf.joblib"))
    joblib.dump(scaler, os.path.join(models_dir, "scaler.joblib"))
    joblib.dump(explainer, os.path.join(models_dir, "shap_explainer.joblib"))

    # Metadata & Metrics JSON
    all_metrics = {
        "model_comparison": {
            "logistic_regression": {
                "model_name": "Logistic Regression (Baseline)",
                "model_version": "v1.0-baseline",
                **lr_metrics
            },
            "random_forest": {
                "model_name": "Random Forest Classifier",
                "model_version": "v1.0-rf",
                **rf_metrics
            },
            "xgboost": {
                "model_name": "XGBoost Fraud Classifier (Primary)",
                "model_version": "xgboost_v1.0",
                "is_active": True,
                **xgb_metrics
            }
        },
        "active_model": {
            "model_name": "XGBoost Fraud Classifier",
            "model_version": "xgboost_v1.0",
            "training_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_count": len(FEATURE_COLUMNS),
            **xgb_metrics,
            "feature_importances": feat_imp
        }
    }

    metrics_file = os.path.join(models_dir, "model_metrics.json")
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(all_metrics, f, indent=2)

    metadata = {
        "feature_names": FEATURE_COLUMNS,
        "feature_descriptions": FEATURE_DESCRIPTIONS,
        "model_version": "xgboost_v1.0",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    meta_file = os.path.join(models_dir, "feature_metadata.json")
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nAll models successfully trained and serialized to {models_dir}", flush=True)
    return all_metrics


if __name__ == "__main__":
    train_and_evaluate_all()
