"""Backward-compatible audit logger facade."""
from datetime import datetime, timezone
from .audit import write_audit as _write, read_audit_logs

def write_audit(agent_id, action, result, details=None):
    details = details or {}
    return _write({
      "audit_id": "legacy-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f"),
      "timestamp": datetime.now(timezone.utc).isoformat(), "agent": agent_id,
      "action": action, "result": result, **details
    })
