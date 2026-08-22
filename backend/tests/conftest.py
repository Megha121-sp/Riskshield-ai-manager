import os
import sys
import pytest
import asyncio
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app.main import app
from backend.app.db.mongodb import db_manager
from backend.ml.model_loader import model_store


@pytest.fixture(scope="session", autouse=True)
def init_test_environment():
    """Initialize DB and load ML models before running tests."""
    asyncio.run(db_manager.connect())
    model_store.load_models()
    yield
    asyncio.run(db_manager.disconnect())


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client
