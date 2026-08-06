import os
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from bson import ObjectId
from pymongo import DESCENDING, MongoClient


@lru_cache(maxsize=1)
def _client() -> MongoClient:
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI is not configured")
    return MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)


def _collection():
    return _client()[os.getenv("MONGODB_DB", "crime_detection")]["analyses"]


def ensure_indexes() -> None:
    collection = _collection()
    collection.create_index([("created_at", DESCENDING)], name="analyses_recent")
    collection.create_index([("kind", 1), ("created_at", DESCENDING)], name="analyses_kind_recent")


def healthy() -> bool:
    try:
        _client().admin.command("ping")
        return True
    except Exception:
        return False


def save_analysis(record: dict[str, Any]) -> dict[str, Any]:
    ensure_indexes()
    document = {**record, "created_at": datetime.now(timezone.utc)}
    result = _collection().insert_one(document)
    document["_id"] = result.inserted_id
    return serialize(document)


def recent_analyses(limit: int = 20, kind: str | None = None) -> list[dict[str, Any]]:
    filters = {"kind": kind} if kind else {}
    cursor = _collection().find(filters).sort("created_at", DESCENDING).limit(limit)
    return [serialize(document) for document in cursor]


def analysis_stats() -> dict[str, Any]:
    collection = _collection()
    grouped = list(collection.aggregate([{"$group": {"_id": "$kind", "count": {"$sum": 1}}}]))
    return {
        "total": collection.count_documents({}),
        "by_kind": {item["_id"]: item["count"] for item in grouped if item.get("_id")},
    }


def serialize(document: dict[str, Any]) -> dict[str, Any]:
    result = dict(document)
    object_id = result.pop("_id", None)
    if isinstance(object_id, ObjectId):
        result["id"] = str(object_id)
    if isinstance(result.get("created_at"), datetime):
        result["created_at"] = result["created_at"].isoformat()
    return result
