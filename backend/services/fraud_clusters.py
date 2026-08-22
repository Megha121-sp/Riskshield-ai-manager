import uuid
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone
from backend.app.db.mongodb import db_manager
from backend.app.models.schemas import FraudCluster

logger = logging.getLogger("riskshield.services.clusters")


async def detect_fraud_clusters(transactions: List[Dict[str, Any]]) -> List[FraudCluster]:
    """
    Graph-like clustering algorithm detecting shared hardware devices or IP addresses
    coordinating multiple customer accounts with high cumulative risk.
    """
    device_to_txns: Dict[str, List[Dict[str, Any]]] = {}
    ip_to_txns: Dict[str, List[Dict[str, Any]]] = {}

    for tx in transactions:
        dev = tx.get("device_id")
        ip = tx.get("ip_address")
        if dev and not dev.startswith("DEV_CUST_"):  # non-standard or shared device
            device_to_txns.setdefault(dev, []).append(tx)
        if ip:
            ip_to_txns.setdefault(ip, []).append(tx)

    clusters: List[FraudCluster] = []
    seen_cluster_signatures = set()

    # 1. Device-based cluster detection
    for dev, tx_list in device_to_txns.items():
        users = list(set(t.get("customer_id") for t in tx_list if t.get("customer_id")))
        if len(users) >= 2:  # Shared device among 2 or more distinct customer accounts
            tx_ids = [t.get("transaction_id") for t in tx_list]
            shared_ips = list(set(t.get("ip_address") for t in tx_list if t.get("ip_address")))
            amt_at_risk = sum(float(t.get("amount", 0)) for t in tx_list)
            
            timestamps = [t.get("timestamp") for t in tx_list if t.get("timestamp")]
            try:
                first_dt = min(timestamps) if timestamps else datetime.now(timezone.utc).isoformat()
                last_dt = max(timestamps) if timestamps else datetime.now(timezone.utc).isoformat()
                if isinstance(first_dt, str):
                    first_dt = datetime.fromisoformat(first_dt.replace("Z", "+00:00"))
                if isinstance(last_dt, str):
                    last_dt = datetime.fromisoformat(last_dt.replace("Z", "+00:00"))
            except Exception:
                first_dt = datetime.now(timezone.utc)
                last_dt = datetime.now(timezone.utc)

            sig = f"DEV_{dev}_{len(users)}"
            if sig not in seen_cluster_signatures:
                seen_cluster_signatures.add(sig)
                cluster = FraudCluster(
                    cluster_id=f"CLUST_DEV_{uuid.uuid4().hex[:8].upper()}",
                    affected_transactions=tx_ids,
                    affected_users=users,
                    shared_devices=[dev],
                    shared_ips=shared_ips,
                    risk_level="CRITICAL" if len(users) >= 3 or amt_at_risk > 50000 else "HIGH",
                    estimated_amount_at_risk=round(amt_at_risk, 2),
                    first_detected=first_dt,
                    last_detected=last_dt,
                    cluster_type="SHARED_DEVICE_NETWORK"
                )
                clusters.append(cluster)

    # 2. IP-based proxy cluster detection
    for ip, tx_list in ip_to_txns.items():
        users = list(set(t.get("customer_id") for t in tx_list if t.get("customer_id")))
        if len(users) >= 3:  # 3+ accounts from single IP (proxy / bot farm)
            sig = f"IP_{ip}_{len(users)}"
            if sig not in seen_cluster_signatures:
                seen_cluster_signatures.add(sig)
                tx_ids = [t.get("transaction_id") for t in tx_list]
                shared_devs = list(set(t.get("device_id") for t in tx_list if t.get("device_id")))
                amt_at_risk = sum(float(t.get("amount", 0)) for t in tx_list)

                cluster = FraudCluster(
                    cluster_id=f"CLUST_IP_{uuid.uuid4().hex[:8].upper()}",
                    affected_transactions=tx_ids,
                    affected_users=users,
                    shared_devices=shared_devs,
                    shared_ips=[ip],
                    risk_level="CRITICAL" if amt_at_risk > 100000 else "HIGH",
                    estimated_amount_at_risk=round(amt_at_risk, 2),
                    first_detected=datetime.now(timezone.utc),
                    last_detected=datetime.now(timezone.utc),
                    cluster_type="SHARED_IP_PROXY_NETWORK"
                )
                clusters.append(cluster)

    return clusters
