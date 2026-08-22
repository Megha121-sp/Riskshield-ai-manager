import re
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone
import copy


class AsyncCursor:
    """Async cursor simulation for in-memory collections."""
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs
        self._index = 0

    def sort(self, key_or_list, direction: int = 1):
        if isinstance(key_or_list, list):
            for k, d in reversed(key_or_list):
                self._docs.sort(key=lambda x: (x.get(k) is None, x.get(k, 0)), reverse=(d == -1))
        elif isinstance(key_or_list, str):
            self._docs.sort(key=lambda x: (x.get(key_or_list) is None, x.get(key_or_list, 0)), reverse=(direction == -1))
        return self

    def skip(self, n: int):
        self._docs = self._docs[n:]
        return self

    def limit(self, n: int):
        self._docs = self._docs[:n]
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index < len(self._docs):
            doc = self._docs[self._index]
            self._index += 1
            return copy.deepcopy(doc)
        raise StopAsyncIteration

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        if length is not None:
            return copy.deepcopy(self._docs[:length])
        return copy.deepcopy(self._docs)


class MemoryCollection:
    """Async-compatible in-memory document collection."""
    def __init__(self, name: str):
        self.name = name
        self._documents: List[Dict[str, Any]] = []

    def _matches_filter(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        if not query:
            return True
        for k, v in query.items():
            if k == "$or":
                if not any(self._matches_filter(doc, sub_q) for sub_q in v):
                    return False
                continue
            if k == "$and":
                if not all(self._matches_filter(doc, sub_q) for sub_q in v):
                    return False
                continue

            doc_val = doc.get(k)
            if isinstance(v, dict):
                for op, op_val in v.items():
                    if op == "$eq" and doc_val != op_val:
                        return False
                    elif op == "$ne" and doc_val == op_val:
                        return False
                    elif op == "$gt" and (doc_val is None or doc_val <= op_val):
                        return False
                    elif op == "$gte" and (doc_val is None or doc_val < op_val):
                        return False
                    elif op == "$lt" and (doc_val is None or doc_val >= op_val):
                        return False
                    elif op == "$lte" and (doc_val is None or doc_val > op_val):
                        return False
                    elif op == "$in" and doc_val not in op_val:
                        return False
                    elif op == "$nin" and doc_val in op_val:
                        return False
                    elif op == "$regex":
                        if doc_val is None:
                            return False
                        flags = re.IGNORECASE if v.get("$options") == "i" else 0
                        if not re.search(op_val, str(doc_val), flags=flags):
                            return False
            else:
                if doc_val != v:
                    return False
        return True

    async def insert_one(self, document: Dict[str, Any]):
        doc_copy = copy.deepcopy(document)
        if "_id" not in doc_copy:
            doc_copy["_id"] = doc_copy.get("transaction_id") or doc_copy.get("user_id") or doc_copy.get("event_id") or doc_copy.get("alert_id") or str(len(self._documents) + 1)
        self._documents.append(doc_copy)
        class InsertResult:
            inserted_id = doc_copy["_id"]
        return InsertResult()

    async def insert_many(self, documents: List[Dict[str, Any]]):
        for doc in documents:
            await self.insert_one(doc)
        class InsertManyResult:
            inserted_ids = [d.get("_id") for d in documents]
        return InsertManyResult()

    async def find_one(self, filter: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        filter = filter or {}
        for doc in self._documents:
            if self._matches_filter(doc, filter):
                res = copy.deepcopy(doc)
                if projection and projection.get("_id") == 0:
                    res.pop("_id", None)
                return res
        return None

    def find(self, filter: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, Any]] = None) -> AsyncCursor:
        filter = filter or {}
        matched = []
        for doc in self._documents:
            if self._matches_filter(doc, filter):
                res = copy.deepcopy(doc)
                if projection and projection.get("_id") == 0:
                    res.pop("_id", None)
                matched.append(res)
        return AsyncCursor(matched)

    async def count_documents(self, filter: Optional[Dict[str, Any]] = None) -> int:
        filter = filter or {}
        return sum(1 for doc in self._documents if self._matches_filter(doc, filter))

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        for doc in self._documents:
            if self._matches_filter(doc, filter):
                if "$set" in update:
                    for k, v in update["$set"].items():
                        doc[k] = copy.deepcopy(v)
                if "$inc" in update:
                    for k, v in update["$inc"].items():
                        doc[k] = doc.get(k, 0) + v
                class UpdateResult:
                    matched_count = 1
                    modified_count = 1
                return UpdateResult()
        
        if upsert:
            new_doc = copy.deepcopy(filter)
            if "$set" in update:
                new_doc.update(update["$set"])
            await self.insert_one(new_doc)
            class UpsertResult:
                matched_count = 0
                modified_count = 1
            return UpsertResult()

        class NoOpResult:
            matched_count = 0
            modified_count = 0
        return NoOpResult()

    async def delete_many(self, filter: Optional[Dict[str, Any]] = None):
        filter = filter or {}
        orig_len = len(self._documents)
        self._documents = [d for d in self._documents if not self._matches_filter(d, filter)]
        class DeleteResult:
            deleted_count = orig_len - len(self._documents)
        return DeleteResult()

    async def distinct(self, key: str, filter: Optional[Dict[str, Any]] = None) -> List[Any]:
        filter = filter or {}
        vals = set()
        for doc in self._documents:
            if self._matches_filter(doc, filter) and key in doc:
                vals.add(doc[key])
        return list(vals)

    async def create_index(self, *args, **kwargs):
        pass


class MemoryDatabase:
    """Async-compatible in-memory database representation."""
    def __init__(self, name: str = "riskshield_db"):
        self.name = name
        self._collections: Dict[str, MemoryCollection] = {}

    def __getitem__(self, item: str) -> MemoryCollection:
        if item not in self._collections:
            self._collections[item] = MemoryCollection(item)
        return self._collections[item]

    def get_collection(self, name: str) -> MemoryCollection:
        return self[name]


memory_db_instance = MemoryDatabase()
