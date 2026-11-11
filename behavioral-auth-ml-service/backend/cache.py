"""
In-Memory Thread-Safe Model and Profile Cache with LRU Eviction & Performance Telemetry.
Eliminates disk I/O on repeated verification requests for active exam/session participants,
bringing scoring latency down to sub-3ms.
"""

import threading
import time
from collections import OrderedDict
from typing import Optional, Dict, Any
import storage

MAX_CACHED_MODELS = 1000  # Max in-memory models before LRU eviction


class ModelCache:
    def __init__(self, max_size: int = MAX_CACHED_MODELS):
        self._max_size = max_size
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def _make_key(self, tenant_id: str, user_id: str) -> str:
        canonical_id = storage._resolve_canonical_id(user_id)
        return f"{tenant_id}::{canonical_id}"

    def get_model(self, tenant_id: str, user_id: str) -> Optional[dict]:
        """
        Retrieve model bundle from in-memory cache.
        If cache miss occurs, loads from disk and hydrates cache.
        """
        key = self._make_key(tenant_id, user_id)
        with self._lock:
            if key in self._cache:
                self._hits += 1
                self._cache.move_to_end(key)
                return self._cache[key]["bundle"]

            self._misses += 1

        # Cache miss: load from persistent storage
        bundle = storage.load_model(user_id, tenant_id=tenant_id)
        if bundle is not None:
            self.set_model(tenant_id, user_id, bundle, persist_to_disk=False)
        return bundle

    def set_model(self, tenant_id: str, user_id: str, bundle: dict, persist_to_disk: bool = True):
        """
        Store model bundle in-memory and optionally persist to disk storage.
        """
        if persist_to_disk:
            storage.save_model(user_id, bundle, tenant_id=tenant_id)

        key = self._make_key(tenant_id, user_id)
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = {
                "bundle": bundle,
                "cached_at": time.time(),
            }
            # Evict oldest if exceeding capacity
            if len(self._cache) > self._max_size:
                self._cache.popitem(last=False)

    def invalidate(self, tenant_id: str, user_id: str):
        """Invalidate model entry in cache (e.g. after model retrain)."""
        key = self._make_key(tenant_id, user_id)
        with self._lock:
            self._cache.pop(key, None)

    def get_stats(self) -> dict:
        """Telemetry metrics for service health monitoring."""
        with self._lock:
            total_lookups = self._hits + self._misses
            hit_ratio = (self._hits / total_lookups * 100.0) if total_lookups > 0 else 0.0
            return {
                "cached_models_count": len(self._cache),
                "max_capacity": self._max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_ratio_pct": round(hit_ratio, 1),
            }


# Global singleton instance
cache = ModelCache()
