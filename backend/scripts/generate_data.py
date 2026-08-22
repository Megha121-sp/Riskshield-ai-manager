import os
import json
import random
import uuid
import numpy as np
from datetime import datetime, timedelta, timezone

# Major Indian metro coordinates
METRO_LOCATIONS = {
    "MUMBAI": {"lat": 19.0760, "lon": 72.8777, "country": "IN"},
    "DELHI": {"lat": 28.6139, "lon": 77.2090, "country": "IN"},
    "BENGALURU": {"lat": 12.9716, "lon": 77.5946, "country": "IN"},
    "HYDERABAD": {"lat": 17.3850, "lon": 78.4867, "country": "IN"},
    "CHENNAI": {"lat": 13.0827, "lon": 80.2707, "country": "IN"},
    "PUNE": {"lat": 18.5204, "lon": 73.8567, "country": "IN"},
    "KOLKATA": {"lat": 22.5726, "lon": 88.3639, "country": "IN"},
    "JAIPUR": {"lat": 26.9124, "lon": 75.7873, "country": "IN"},
    "AHMEDABAD": {"lat": 23.0225, "lon": 72.5714, "country": "IN"},
}

INTERNATIONAL_ANOMALIES = [
    {"lat": 51.5074, "lon": -0.1278, "country": "GB"},  # London
    {"lat": 40.7128, "lon": -74.0060, "country": "US"},  # New York
    {"lat": 25.2048, "lon": 55.2708, "country": "AE"},   # Dubai
    {"lat": 1.3521, "lon": 103.8198, "country": "SG"},   # Singapore
    {"lat": 55.7558, "lon": 37.6173, "country": "RU"}   # Moscow
]

MERCHANT_CATEGORIES = [
    "ELECTRONICS", "TRAVEL", "GAMING", "GROCERY", "LUXURY",
    "UTILITIES", "PHARMACY", "FASHION", "ENTERTAINMENT", "DINING"
]

PAYMENT_METHODS = [
    "UPI", "CREDIT_CARD", "DEBIT_CARD", "NET_BANKING", "WALLET"
]

MERCHANTS = {
    "ELECTRONICS": ["MERCH_Croma", "MERCH_RelianceDigital", "MERCH_AppleStore", "MERCH_VijaySales"],
    "TRAVEL": ["MERCH_MakeMyTrip", "MERCH_IRCTC", "MERCH_Goibibo", "MERCH_EaseMyTrip"],
    "GAMING": ["MERCH_SteamIndia", "MERCH_PlayStationNetwork", "MERCH_RazerGold", "MERCH_WinZO"],
    "GROCERY": ["MERCH_Blinkit", "MERCH_Zepto", "MERCH_BigBasket", "MERCH_Instamart"],
    "LUXURY": ["MERCH_Tanishq", "MERCH_RolexBoutique", "MERCH_EthosWatches", "MERCH_TajPalace"],
    "UTILITIES": ["MERCH_Bescom", "MERCH_AdaniElectricity", "MERCH_AirtelBill", "MERCH_JioPrepaid"],
    "PHARMACY": ["MERCH_ApolloPharmacy", "MERCH_Tata1mg", "MERCH_Netmeds", "MERCH_PharmEasy"],
    "FASHION": ["MERCH_Myntra", "MERCH_Nykaa", "MERCH_ZaraIndia", "MERCH_Ajio"],
    "ENTERTAINMENT": ["MERCH_BookMyShow", "MERCH_Netflix", "MERCH_PVRInox", "MERCH_Hotstar"],
    "DINING": ["MERCH_Zomato", "MERCH_Swiggy", "MERCH_StarbucksIndia", "MERCH_Dominos"]
}


def generate_customer_profiles(num_customers: int = 300):
    profiles = []
    cities = list(METRO_LOCATIONS.keys())

    for i in range(1, num_customers + 1):
        cid = f"CUST_{i:04d}"
        city = random.choice(cities)
        loc = METRO_LOCATIONS[city]

        # Base spending archetype
        archetype = random.choices(
            ["STUDENT", "YOUNG_PROFESSIONAL", "FAMILY_AFFLUENT", "HIGH_NET_WORTH"],
            weights=[0.25, 0.45, 0.22, 0.08]
        )[0]

        if archetype == "STUDENT":
            avg_amt = round(random.uniform(200, 1200), 2)
            std_amt = round(avg_amt * 0.4, 2)
            preferred_cats = ["GROCERY", "DINING", "ENTERTAINMENT", "GAMING"]
            preferred_pms = ["UPI", "WALLET", "DEBIT_CARD"]
            account_age = random.randint(15, 300)
        elif archetype == "YOUNG_PROFESSIONAL":
            avg_amt = round(random.uniform(1500, 6000), 2)
            std_amt = round(avg_amt * 0.45, 2)
            preferred_cats = ["DINING", "FASHION", "ELECTRONICS", "TRAVEL", "GROCERY"]
            preferred_pms = ["UPI", "CREDIT_CARD", "NET_BANKING"]
            account_age = random.randint(90, 800)
        elif archetype == "FAMILY_AFFLUENT":
            avg_amt = round(random.uniform(4000, 15000), 2)
            std_amt = round(avg_amt * 0.5, 2)
            preferred_cats = ["GROCERY", "TRAVEL", "UTILITIES", "FASHION", "PHARMACY"]
            preferred_pms = ["CREDIT_CARD", "NET_BANKING", "UPI"]
            account_age = random.randint(180, 1400)
        else:  # HIGH_NET_WORTH
            avg_amt = round(random.uniform(18000, 60000), 2)
            std_amt = round(avg_amt * 0.6, 2)
            preferred_cats = ["LUXURY", "TRAVEL", "ELECTRONICS", "FASHION"]
            preferred_pms = ["CREDIT_CARD", "NET_BANKING"]
            account_age = random.randint(300, 2000)

        devices = [f"DEV_{cid}_{j}" for j in range(random.randint(1, 3))]
        home_ip = f"103.{random.randint(20, 150)}.{random.randint(1, 250)}.{random.randint(1, 250)}"

        profiles.append({
            "customer_id": cid,
            "city": city,
            "home_latitude": loc["lat"] + random.uniform(-0.05, 0.05),
            "home_longitude": loc["lon"] + random.uniform(-0.05, 0.05),
            "home_country": "IN",
            "historical_average_amount": avg_amt,
            "historical_amount_std": std_amt,
            "historical_max_amount": round(avg_amt * random.uniform(2.5, 4.5), 2),
            "historical_transaction_count": random.randint(20, 250),
            "account_age_days": account_age,
            "devices": devices,
            "primary_device": devices[0],
            "home_ip": home_ip,
            "preferred_categories": preferred_cats,
            "preferred_payment_methods": preferred_pms,
            "previous_failed_transactions": random.choices([0, 1, 2], weights=[0.85, 0.12, 0.03])[0],
            "previous_fraud_count": 0
        })
    return profiles


def generate_synthetic_transactions(num_transactions: int = 10000):
    profiles = generate_customer_profiles(num_customers=350)
    profile_map = {p["customer_id"]: p for p in profiles}

    transactions = []
    base_time = datetime.now(timezone.utc) - timedelta(days=30)
    
    # 1. Generate baseline legitimate transactions (~94%)
    num_legit = int(num_transactions * 0.94)
    for i in range(num_legit):
        cust = random.choice(profiles)
        tx_time = base_time + timedelta(
            days=random.uniform(0, 30),
            hours=random.choices(range(24), weights=[1, 1, 1, 1, 1, 2, 4, 6, 8, 9, 10, 10, 9, 8, 8, 9, 10, 10, 9, 8, 6, 4, 2, 1])[0],
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59)
        )

        amount = max(50.0, float(np.random.normal(cust["historical_average_amount"], cust["historical_amount_std"])))
        amount = round(amount, 2)
        cat = random.choice(cust["preferred_categories"])
        pm = random.choice(cust["preferred_payment_methods"])
        merch = random.choice(MERCHANTS.get(cat, ["MERCH_Generic"]))
        
        # Legitimate location jitter (< 10km)
        lat = cust["home_latitude"] + random.uniform(-0.03, 0.03)
        lon = cust["home_longitude"] + random.uniform(-0.03, 0.03)
        dev = cust["primary_device"] if random.random() < 0.9 else random.choice(cust["devices"])
        ip = cust["home_ip"]

        status = "SUCCESS" if random.random() > 0.02 else "FAILED"
        fail_reason = "INSUFFICIENT_FUNDS" if status == "FAILED" else None

        tx = {
            "transaction_id": f"TXN_{uuid.uuid4().hex[:10].upper()}",
            "customer_id": cust["customer_id"],
            "amount": amount,
            "currency": "INR",
            "timestamp": tx_time.isoformat(),
            "payment_method": pm,
            "merchant_id": merch,
            "merchant_category": cat,
            "device_id": dev,
            "ip_address": ip,
            "country": "IN",
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "status": status,
            "failure_reason": fail_reason,
            "is_new_device": False,
            "previous_transaction_count": cust["historical_transaction_count"] + random.randint(1, 10),
            "average_transaction_amount": cust["historical_average_amount"],
            "transactions_last_10min": 1,
            "transactions_last_1hour": random.randint(1, 2),
            "account_age_days": cust["account_age_days"],
            "is_fraud": 0
        }
        transactions.append(tx)

    # 2. Inject Fraud Patterns (~6%)
    fraud_count_target = num_transactions - num_legit
    fraud_txns = []

    # Shared Cluster Resources for Pattern 7 & 8
    CLUSTER_DEVICE_1 = "DEV_SYNDICATE_ALPHA_99"
    CLUSTER_IP_1 = "185.220.101.5"  # Known suspicious proxy
    CLUSTER_DEVICE_2 = "DEV_CARDING_RING_404"
    CLUSTER_IP_2 = "194.26.29.112"

    # Distribute fraud across 10 patterns
    patterns = [
        "AMOUNT_DEVIATION",
        "HIGH_VELOCITY",
        "NEW_DEVICE_HIGH_VAL",
        "LOCATION_ANOMALY",
        "FAILED_TXN_BURST",
        "UNUSUAL_NIGHT_TIME",
        "SHARED_DEVICE_CLUSTER",
        "SHARED_IP_CLUSTER",
        "NEW_ACCOUNT_EXPLOIT",
        "COORDINATED_BURST"
    ]

    per_pattern = fraud_count_target // len(patterns)

    for pat in patterns:
        for _ in range(per_pattern):
            cust = random.choice(profiles)
            tx_time = base_time + timedelta(days=random.uniform(5, 29), hours=random.randint(0, 23), minutes=random.randint(0, 59))
            
            amt = cust["historical_average_amount"]
            cat = random.choice(MERCHANT_CATEGORIES)
            pm = random.choice(PAYMENT_METHODS)
            dev = cust["primary_device"]
            ip = cust["home_ip"]
            lat = cust["home_latitude"]
            lon = cust["home_longitude"]
            country = "IN"
            status = "SUCCESS"
            fail_reason = None
            is_new_dev = False
            tx_10m = 1
            tx_1h = 1
            acct_age = cust["account_age_days"]

            if pat == "AMOUNT_DEVIATION":
                amt = round(cust["historical_average_amount"] * random.uniform(8.0, 25.0) + 10000, 2)
                cat = "LUXURY" if random.random() < 0.6 else "ELECTRONICS"
                pm = "CREDIT_CARD"

            elif pat == "HIGH_VELOCITY":
                amt = round(random.uniform(5000, 25000), 2)
                tx_10m = random.randint(6, 14)
                tx_1h = tx_10m + random.randint(2, 6)
                cat = "GAMING" if random.random() < 0.7 else "GIFT_CARDS"

            elif pat == "NEW_DEVICE_HIGH_VAL":
                amt = round(cust["historical_average_amount"] * random.uniform(5.0, 15.0), 2)
                dev = f"DEV_UNRECOGNIZED_{uuid.uuid4().hex[:6].upper()}"
                is_new_dev = True
                ip = f"146.70.{random.randint(10, 200)}.{random.randint(1, 250)}"

            elif pat == "LOCATION_ANOMALY":
                intl = random.choice(INTERNATIONAL_ANOMALIES)
                lat = intl["lat"]
                lon = intl["lon"]
                country = intl["country"]
                amt = round(random.uniform(12000, 45000), 2)
                cat = "TRAVEL"

            elif pat == "FAILED_TXN_BURST":
                status = random.choice(["FAILED", "SUCCESS"])
                fail_reason = "CVV_VERIFICATION_FAILED" if status == "FAILED" else None
                amt = round(random.uniform(8000, 30000), 2)
                tx_10m = random.randint(4, 9)

            elif pat == "UNUSUAL_NIGHT_TIME":
                tx_time = tx_time.replace(hour=random.choice([2, 3, 4]), minute=random.randint(10, 50))
                amt = round(cust["historical_average_amount"] * random.uniform(4.0, 12.0), 2)
                cat = "GAMING"

            elif pat == "SHARED_DEVICE_CLUSTER":
                dev = CLUSTER_DEVICE_1
                ip = CLUSTER_IP_1
                amt = round(random.uniform(15000, 50000), 2)
                cat = "ELECTRONICS"
                is_new_dev = True
                tx_10m = random.randint(3, 8)

            elif pat == "SHARED_IP_CLUSTER":
                ip = CLUSTER_IP_2
                dev = CLUSTER_DEVICE_2 if random.random() < 0.5 else f"DEV_BOT_{random.randint(1, 10)}"
                amt = round(random.uniform(10000, 40000), 2)
                cat = "LUXURY"
                tx_10m = random.randint(4, 10)

            elif pat == "NEW_ACCOUNT_EXPLOIT":
                acct_age = random.randint(1, 3)
                amt = round(random.uniform(25000, 75000), 2)
                cat = "ELECTRONICS"
                is_new_dev = True

            elif pat == "COORDINATED_BURST":
                amt = round(random.uniform(20000, 60000), 2)
                tx_10m = random.randint(7, 15)
                tx_1h = tx_10m + 5
                cat = "GAMING"
                is_new_dev = True

            merch = random.choice(MERCHANTS.get(cat, ["MERCH_Generic"]))
            tx = {
                "transaction_id": f"TXN_FRD_{uuid.uuid4().hex[:9].upper()}",
                "customer_id": cust["customer_id"],
                "amount": amt,
                "currency": "INR",
                "timestamp": tx_time.isoformat(),
                "payment_method": pm,
                "merchant_id": merch,
                "merchant_category": cat,
                "device_id": dev,
                "ip_address": ip,
                "country": country,
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "status": status,
                "failure_reason": fail_reason,
                "is_new_device": is_new_dev,
                "previous_transaction_count": cust["historical_transaction_count"],
                "average_transaction_amount": cust["historical_average_amount"],
                "transactions_last_10min": tx_10m,
                "transactions_last_1hour": tx_1h,
                "account_age_days": acct_age,
                "is_fraud": 1
            }
            fraud_txns.append(tx)

    transactions.extend(fraud_txns)

    # 3. Add Predefined Demo Scenarios with deterministic, recognizable IDs for 1-click demos
    demo_scenarios = [
        {
            "transaction_id": "TXN_DEMO_01_NORMAL",
            "customer_id": "CUST_0042",
            "amount": 1250.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat(),
            "payment_method": "UPI",
            "merchant_id": "MERCH_Blinkit",
            "merchant_category": "GROCERY",
            "device_id": "DEV_CUST_0042_0",
            "ip_address": "103.45.12.89",
            "country": "IN",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": False,
            "previous_transaction_count": 48,
            "average_transaction_amount": 1400.0,
            "transactions_last_10min": 1,
            "transactions_last_1hour": 1,
            "account_age_days": 210,
            "is_fraud": 0
        },
        {
            "transaction_id": "TXN_DEMO_02_HIGH_VALUE",
            "customer_id": "CUST_0015",
            "amount": 88000.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=12)).isoformat(),
            "payment_method": "CREDIT_CARD",
            "merchant_id": "MERCH_AppleStore",
            "merchant_category": "ELECTRONICS",
            "device_id": "DEV_CUST_0015_0",
            "ip_address": "103.22.45.11",
            "country": "IN",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": False,
            "previous_transaction_count": 22,
            "average_transaction_amount": 2200.0,
            "transactions_last_10min": 1,
            "transactions_last_1hour": 2,
            "account_age_days": 180,
            "is_fraud": 1
        },
        {
            "transaction_id": "TXN_DEMO_03_NEW_DEVICE",
            "customer_id": "CUST_0088",
            "amount": 42500.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=25)).isoformat(),
            "payment_method": "CREDIT_CARD",
            "merchant_id": "MERCH_Tanishq",
            "merchant_category": "LUXURY",
            "device_id": "DEV_UNSEEN_MACBOOK_X89",
            "ip_address": "146.70.88.19",
            "country": "IN",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": True,
            "previous_transaction_count": 35,
            "average_transaction_amount": 3100.0,
            "transactions_last_10min": 1,
            "transactions_last_1hour": 1,
            "account_age_days": 320,
            "is_fraud": 1
        },
        {
            "transaction_id": "TXN_DEMO_04_VELOCITY_BURST",
            "customer_id": "CUST_0110",
            "amount": 15000.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=8)).isoformat(),
            "payment_method": "UPI",
            "merchant_id": "MERCH_SteamIndia",
            "merchant_category": "GAMING",
            "device_id": "DEV_CUST_0110_0",
            "ip_address": "103.88.92.14",
            "country": "IN",
            "latitude": 17.3850,
            "longitude": 78.4867,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": False,
            "previous_transaction_count": 60,
            "average_transaction_amount": 1800.0,
            "transactions_last_10min": 9,
            "transactions_last_1hour": 14,
            "account_age_days": 150,
            "is_fraud": 1
        },
        {
            "transaction_id": "TXN_DEMO_05_LOCATION_ANOMALY",
            "customer_id": "CUST_0029",
            "amount": 34000.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat(),
            "payment_method": "CREDIT_CARD",
            "merchant_id": "MERCH_TajPalace",
            "merchant_category": "TRAVEL",
            "device_id": "DEV_CUST_0029_0",
            "ip_address": "185.220.101.88",
            "country": "RU",
            "latitude": 55.7558,
            "longitude": 37.6173,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": True,
            "previous_transaction_count": 80,
            "average_transaction_amount": 4200.0,
            "transactions_last_10min": 1,
            "transactions_last_1hour": 1,
            "account_age_days": 450,
            "is_fraud": 1
        },
        {
            "transaction_id": "TXN_DEMO_06_ACCOUNT_TAKEOVER",
            "customer_id": "CUST_0190",
            "amount": 65000.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=4)).isoformat(),
            "payment_method": "CREDIT_CARD",
            "merchant_id": "MERCH_VijaySales",
            "merchant_category": "ELECTRONICS",
            "device_id": "DEV_HIJACKED_LINUX_BOX",
            "ip_address": "194.26.29.112",
            "country": "IN",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": True,
            "previous_transaction_count": 14,
            "average_transaction_amount": 1100.0,
            "transactions_last_10min": 7,
            "transactions_last_1hour": 11,
            "account_age_days": 60,
            "is_fraud": 1
        },
        {
            "transaction_id": "TXN_DEMO_07_FRAUD_CLUSTER",
            "customer_id": "CUST_0234",
            "amount": 29000.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat(),
            "payment_method": "NET_BANKING",
            "merchant_id": "MERCH_RazerGold",
            "merchant_category": "GAMING",
            "device_id": CLUSTER_DEVICE_1,
            "ip_address": CLUSTER_IP_1,
            "country": "IN",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": True,
            "previous_transaction_count": 8,
            "average_transaction_amount": 2000.0,
            "transactions_last_10min": 6,
            "transactions_last_1hour": 10,
            "account_age_days": 18,
            "is_fraud": 1
        },
        {
            "transaction_id": "TXN_DEMO_08_FRAUD_SPIKE",
            "customer_id": "CUST_0301",
            "amount": 48000.0,
            "currency": "INR",
            "timestamp": (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat(),
            "payment_method": "CREDIT_CARD",
            "merchant_id": "MERCH_EthosWatches",
            "merchant_category": "LUXURY",
            "device_id": CLUSTER_DEVICE_2,
            "ip_address": CLUSTER_IP_2,
            "country": "IN",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "status": "SUCCESS",
            "failure_reason": None,
            "is_new_device": True,
            "previous_transaction_count": 5,
            "average_transaction_amount": 2500.0,
            "transactions_last_10min": 8,
            "transactions_last_1hour": 12,
            "account_age_days": 12,
            "is_fraud": 1
        }
    ]

    transactions.extend(demo_scenarios)

    # Sort descending by timestamp
    transactions.sort(key=lambda x: x["timestamp"], reverse=True)

    return profiles, transactions


def save_and_seed_data(output_dir: str = None):
    output_dir = output_dir or os.path.join(os.path.dirname(__file__), "../../ml/data")
    os.makedirs(output_dir, exist_ok=True)

    print(f"Generating 10,000+ synthetic transactions with realistic risk patterns...")
    profiles, transactions = generate_synthetic_transactions(10500)

    out_file = os.path.join(output_dir, "demo_transactions.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(transactions, f, indent=2)

    profiles_file = os.path.join(output_dir, "customer_profiles.json")
    with open(profiles_file, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2)

    print(f"Successfully generated {len(transactions)} transactions across {len(profiles)} customer profiles.")
    print(f"Saved to: {out_file}")
    return transactions, profiles


if __name__ == "__main__":
    save_and_seed_data()
