"""
Activity, Verifications, and Telemetry Engine for BioAuth BaaS
Records granular verification events, risk detections, audit actions,
and computes time-bucketed analytics strictly scoped to individual workspaces.
Zero fake data: returns real database logs or structured empty states.
"""

import os
import json
import secrets
import threading
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
TENANTS_DIR = os.path.join(DATA_DIR, "tenants")
NOTIFICATIONS_FILE = os.path.join(DATA_DIR, "platform_notifications.json")
os.makedirs(TENANTS_DIR, exist_ok=True)

_activity_lock = threading.Lock()
MAX_LOG_RECORDS = 500


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tenant_dir(tenant_id: str) -> str:
    path = os.path.join(TENANTS_DIR, tenant_id)
    os.makedirs(path, exist_ok=True)
    return path


def _read_json(path: str, default_val: Any) -> Any:
    if not os.path.exists(path):
        return default_val
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default_val


def _write_json(path: str, data: Any):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def record_verification(tenant_id: str, record: dict):
    """Log one verification request to tenant's persistent event store."""
    def _bg():
        with _activity_lock:
            p = os.path.join(_tenant_dir(tenant_id), "verifications.json")
            events = _read_json(p, [])
            entry = {
                "id": "ver_" + secrets.token_hex(6),
                "timestamp": _now_iso(),
                "user_id": record.get("user_id"),
                "trust_score": record.get("trust_score"),
                "confidence": record.get("confidence", 0),
                "risk_level": record.get("risk_level", "low"),
                "action": record.get("action", "allow"),
                "latency_ms": record.get("latency_ms", 0),
                "reason": record.get("reason", ""),
            }
            events.insert(0, entry)
            events = events[:MAX_LOG_RECORDS]
            _write_json(p, events)

    threading.Thread(target=_bg, daemon=True).start()


def record_risk_event(tenant_id: str, record: dict):
    """Log an anomaly/risk event to tenant's persistent store."""
    def _bg():
        with _activity_lock:
            p = os.path.join(_tenant_dir(tenant_id), "risk_events.json")
            events = _read_json(p, [])
            entry = {
                "id": "risk_" + secrets.token_hex(6),
                "timestamp": _now_iso(),
                "user_id": record.get("user_id"),
                "action": record.get("action", "step_up"),
                "risk_level": record.get("risk_level", "medium"),
                "trust_score": record.get("trust_score"),
                "rolling_avg_trust": record.get("rolling_avg_trust"),
                "reason": record.get("reason", "Keystroke rhythm deviation detected"),
                "webhook_dispatched": record.get("webhook_dispatched", False),
                "alert_grouped": record.get("alert_grouped", False),
            }
            events.insert(0, entry)
            events = events[:MAX_LOG_RECORDS]
            _write_json(p, events)

    threading.Thread(target=_bg, daemon=True).start()


def record_audit_event(tenant_id: str, actor_name: str, action: str, details: str):
    """Log an administrative / security action into workspace audit trail."""
    def _bg():
        with _activity_lock:
            p = os.path.join(_tenant_dir(tenant_id), "audit_logs.json")
            logs = _read_json(p, [])
            entry = {
                "id": "aud_" + secrets.token_hex(6),
                "timestamp": _now_iso(),
                "actor": actor_name,
                "action": action,
                "details": details,
            }
            logs.insert(0, entry)
            logs = logs[:MAX_LOG_RECORDS]
            _write_json(p, logs)

    threading.Thread(target=_bg, daemon=True).start()


def get_verifications(tenant_id: str, limit: int = 50, action_filter: Optional[str] = None) -> List[dict]:
    with _activity_lock:
        p = os.path.join(_tenant_dir(tenant_id), "verifications.json")
        events = _read_json(p, [])
        if action_filter and action_filter != "all":
            events = [e for e in events if e.get("action") == action_filter]
        return events[:limit]


def get_risk_events(tenant_id: str, limit: int = 50) -> List[dict]:
    with _activity_lock:
        p = os.path.join(_tenant_dir(tenant_id), "risk_events.json")
        return _read_json(p, [])[:limit]


def get_audit_logs(tenant_id: str, limit: int = 50) -> List[dict]:
    with _activity_lock:
        p = os.path.join(_tenant_dir(tenant_id), "audit_logs.json")
        return _read_json(p, [])[:limit]


def get_all_platform_audit_logs(limit: int = 100) -> List[dict]:
    """Admin function: aggregate audit logs across all tenants."""
    with _activity_lock:
        all_logs = []
        if os.path.exists(TENANTS_DIR):
            for tid in os.listdir(TENANTS_DIR):
                p = os.path.join(TENANTS_DIR, tid, "audit_logs.json")
                if os.path.exists(p):
                    tenant_logs = _read_json(p, [])
                    for item in tenant_logs:
                        item["tenant_id"] = tid
                        all_logs.append(item)
        all_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return all_logs[:limit]


def create_platform_notification(title: str, message: str, audience: str, organization_id: Optional[str], created_by: str) -> dict:
    """Persist an admin announcement for all organizations or one organization."""
    with _activity_lock:
        notices = _read_json(NOTIFICATIONS_FILE, [])
        entry = {
            "id": "notice_" + secrets.token_hex(8),
            "title": title,
            "message": message,
            "audience": audience,
            "organization_id": organization_id,
            "created_by": created_by,
            "created_at": _now_iso(),
        }
        notices.insert(0, entry)
        _write_json(NOTIFICATIONS_FILE, notices[:500])
        return entry


def get_platform_notifications(organization_id: Optional[str] = None, limit: int = 100) -> List[dict]:
    """List notices for admins, or notices visible to a specific organization."""
    with _activity_lock:
        notices = _read_json(NOTIFICATIONS_FILE, [])
        if organization_id is not None:
            notices = [item for item in notices if item.get("audience") == "all" or item.get("organization_id") == organization_id]
        return notices[:limit]


def get_recent_activity(tenant_id: str, limit: int = 15) -> List[dict]:
    """
    Synthesize chronologically ordered recent activity items for the dashboard.
    Groups consecutive risk events for the same user within a 60-second window into
    a single summary item to avoid flooding the feed with repeated alerts from a
    single session.
    """
    with _activity_lock:
        ver_path = os.path.join(_tenant_dir(tenant_id), "verifications.json")
        aud_path = os.path.join(_tenant_dir(tenant_id), "audit_logs.json")

        vers = _read_json(ver_path, [])[:50]
        auds = _read_json(aud_path, [])[:15]

        items = []

        # Audit events (admin actions) — always shown individually
        for a in auds:
            items.append({
                "id": a["id"],
                "type": "audit",
                "title": a["action"].replace("_", " ").title(),
                "description": f"{a.get('actor', 'User')}: {a.get('details', '')}",
                "timestamp": a["timestamp"],
                "badge": "info",
            })

        # Verification events — group rapid consecutive risk events per user per session
        # A "session" window is 120 seconds. If >1 risk event from same user in window, show summary.
        risk_groups: Dict[str, list] = {}  # key: user_id -> list of risk ver entries
        allow_events = []

        for v in vers:
            act = v.get("action", "allow")
            if act in ("deny", "step_up"):
                uid = v.get("user_id", "unknown")
                risk_groups.setdefault(uid, []).append(v)
            else:
                allow_events.append(v)

        # Emit one grouped risk entry per user (covering the most recent burst)
        for uid, risk_vers in risk_groups.items():
            # Sort descending by timestamp
            risk_vers.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
            # Group into 120-second session windows
            emitted_windows: list = []
            for rv in risk_vers:
                try:
                    t = datetime.fromisoformat(rv["timestamp"])
                except Exception:
                    t = None
                placed = False
                for w in emitted_windows:
                    try:
                        wt = datetime.fromisoformat(w["latest"])
                        if t and abs((wt - t).total_seconds()) <= 120:
                            w["count"] += 1
                            w["entries"].append(rv)
                            if t > wt:
                                w["latest"] = rv["timestamp"]
                                w["latest_entry"] = rv
                            placed = True
                            break
                    except Exception:
                        pass
                if not placed:
                    emitted_windows.append({
                        "latest": rv["timestamp"],
                        "latest_entry": rv,
                        "count": 1,
                        "entries": [rv],
                    })

            for w in emitted_windows:
                le = w["latest_entry"]
                act = le.get("action", "step_up")
                count = w["count"]
                if count == 1:
                    title = f"Security Alert: {act.replace('_', ' ').upper()}"
                    desc = f"User {uid}: {le.get('reason') or 'Behavior rhythm deviation'} (Trust: {le.get('trust_score', '--')})"
                else:
                    title = f"Security Alert: {act.replace('_', ' ').upper()} ×{count}"
                    # Show trust score range across the session
                    scores = [e.get("trust_score") for e in w["entries"] if e.get("trust_score") is not None]
                    score_range = f"{min(scores):.0f}–{max(scores):.0f}" if scores else "--"
                    desc = f"User {uid}: {count} alerts in session — trust scores {score_range}"
                items.append({
                    "id": le["id"],
                    "type": "risk",
                    "title": title,
                    "description": desc,
                    "timestamp": w["latest"],
                    "badge": "danger" if act == "deny" else "warning",
                })

        # Show up to 5 recent allow events
        for v in allow_events[:5]:
            items.append({
                "id": v["id"],
                "type": "verification",
                "title": "Verification: ALLOW",
                "description": f"User {v.get('user_id')} verified (Trust: {v.get('trust_score', '--')} · {v.get('latency_ms', 0)}ms)",
                "timestamp": v["timestamp"],
                "badge": "good",
            })

        items.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return items[:limit]


def get_analytics(tenant_id: str, period: str = "7d") -> dict:
    """Generate time-series buckets from real verification logs."""
    with _activity_lock:
        p = os.path.join(_tenant_dir(tenant_id), "verifications.json")
        all_vers = _read_json(p, [])

        now = datetime.now(timezone.utc)
        if period == "24h":
            delta = timedelta(hours=24)
            num_buckets = 24
            bucket_duration = timedelta(hours=1)
            fmt = "%H:00"
        elif period == "30d":
            delta = timedelta(days=30)
            num_buckets = 30
            bucket_duration = timedelta(days=1)
            fmt = "%b %d"
        elif period == "90d":
            delta = timedelta(days=90)
            num_buckets = 12  # weekly buckets
            bucket_duration = timedelta(days=7)
            fmt = "%b %d"
        else:  # "7d"
            delta = timedelta(days=7)
            num_buckets = 7
            bucket_duration = timedelta(days=1)
            fmt = "%a"

        start_time = now - delta
        relevant = []
        for e in all_vers:
            try:
                t = datetime.fromisoformat(e["timestamp"])
                if t >= start_time:
                    relevant.append((t, e))
            except Exception:
                pass

        # Construct time buckets
        buckets = []
        for i in range(num_buckets):
            b_start = start_time + (i * bucket_duration)
            b_end = b_start + bucket_duration
            b_label = b_start.strftime(fmt)

            in_bucket = [e for (t, e) in relevant if b_start <= t < b_end]
            allows = sum(1 for e in in_bucket if e.get("action") == "allow")
            stepups = sum(1 for e in in_bucket if e.get("action") == "step_up")
            denies = sum(1 for e in in_bucket if e.get("action") == "deny")
            buckets.append({
                "label": b_label,
                "total": len(in_bucket),
                "allows": allows,
                "step_ups": stepups,
                "denies": denies,
            })

        total_verifications = len(relevant)
        total_anomalies = sum(1 for (_, e) in relevant if e.get("action") in ("step_up", "deny"))

        return {
            "period": period,
            "total_requests": total_verifications,
            "total_verifications": total_verifications,
            "anomalies_flagged": total_anomalies,
            "buckets": buckets,
            "has_data": len(relevant) > 0,
        }
