import logging
import asyncio
from typing import Optional, Any, Dict, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.app.core.config import settings
from backend.app.db.memory_store import memory_db_instance

logger = logging.getLogger("riskshield.db")


def clean_mongo_doc(doc: Any) -> Any:
    """Helper to remove MongoDB _id ObjectId and convert datetimes to ISO strings for clean JSON serialization."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [clean_mongo_doc(d) for d in doc]
    if isinstance(doc, dict):
        cleaned = {}
        for k, v in doc.items():
            if k == "_id":
                continue
            elif hasattr(v, "isoformat"):
                cleaned[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                cleaned[k] = clean_mongo_doc(v)
            elif type(v).__name__ == "ObjectId":
                cleaned[k] = str(v)
            else:
                cleaned[k] = v
        return cleaned
    if type(doc).__name__ == "ObjectId":
        return str(doc)
    return doc


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None
    is_memory_mode: bool = False

    async def connect(self):
        """Attempt connection to real MongoDB; fallback gracefully to in-memory store if unavailable."""
        if not settings.USE_MEMORY_DB_FALLBACK:
            try:
                self.client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
                await self.client.admin.command("ping")
                self.db = self.client[settings.DATABASE_NAME]
                self.is_memory_mode = False
                logger.info(f"Connected to MongoDB at {settings.MONGODB_URI} [{settings.DATABASE_NAME}]")
                await self._init_indexes()
                return
            except Exception as e:
                logger.error(f"Failed to connect to MongoDB: {e}")
                raise e

        # Attempt fast probe with 1.5s timeout
        try:
            temp_client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=1500)
            await asyncio.wait_for(temp_client.admin.command("ping"), timeout=1.8)
            self.client = temp_client
            self.db = self.client[settings.DATABASE_NAME]
            self.is_memory_mode = False
            logger.info(f"Connected to live MongoDB at {settings.MONGODB_URI} [{settings.DATABASE_NAME}]")
            await self._init_indexes()
        except Exception as e:
            logger.warning(f"MongoDB not reachable ({e}). Engaging embedded high-performance memory store.")
            self.client = None
            self.db = memory_db_instance
            self.is_memory_mode = True

    async def _init_indexes(self):
        """Create standard indexes for collections."""
        try:
            if self.db is not None:
                await self.db.transactions.create_index("transaction_id", unique=True)
                await self.db.transactions.create_index("customer_id")
                await self.db.transactions.create_index("timestamp")
                await self.db.transactions.create_index("status")
                await self.db.risk_scores.create_index("transaction_id", unique=True)
                await self.db.users.create_index("username", unique=True)
                await self.db.risk_alerts.create_index("alert_id", unique=True)
                await self.db.investigations.create_index("transaction_id", unique=True)
                await self.db.audit_logs.create_index("timestamp")
        except Exception as e:
            logger.warning(f"Index creation notice: {e}")

    async def disconnect(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    def get_collection(self, name: str):
        if self.db is None:
            return memory_db_instance[name]
        return self.db[name]


db_manager = DatabaseManager()


def get_db():
    return db_manager.db
