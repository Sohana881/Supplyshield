"""Centralized agent permission registry backed by data/policies.json."""
import json
from pathlib import Path
POLICY_FILE=Path(__file__).resolve().parent.parent/"data"/"policies.json"
def _config(): return json.loads(POLICY_FILE.read_text(encoding="utf-8"))
def get_agent_policy(agent_id): return _config().get("agent_permissions",{}).get(agent_id,{})
def get_all_agent_policies(): return _config().get("agent_permissions",{})
def has_permission(agent_id,permission): return permission.upper() in {str(x).upper() for x in get_agent_policy(agent_id).get("allowedActions",[])}
def require_permission(agent_id,permission):
    if not has_permission(agent_id,permission): raise PermissionError(f"Agent '{agent_id}' is not authorized to perform '{permission}'")
    return True
