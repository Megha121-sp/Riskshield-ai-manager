import pytest
import uuid
from fastapi.testclient import TestClient


def test_db_transaction_persistence(client: TestClient):
    tid = f"TXN_PERSIST_{uuid.uuid4().hex[:6]}"
    doc = {
        "customer_id": "CUST_PERSIST_01",
        "amount": 2500.0,
        "payment_method": "UPI",
        "merchant_category": "GROCERY"
    }
    create_res = client.post("/api/transactions", json=doc)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["transaction"]["amount"] == 2500.0

    retrieved = client.get(f"/api/transactions/{created['transaction']['transaction_id']}")
    assert retrieved.status_code == 200
    assert retrieved.json()["transaction"]["amount"] == 2500.0
