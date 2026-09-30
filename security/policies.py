"""Data-driven governance policies."""
import json
from pathlib import Path
POLICY_FILE=Path(__file__).resolve().parent.parent/"data"/"policies.json"
def load_policy_config(): return json.loads(POLICY_FILE.read_text(encoding="utf-8"))
def get_policy(name): return load_policy_config().get(name,{})
def get_ui_policies(): return [p for p in load_policy_config().get("ui_policies",[]) if p.get("enabled",True)]
def get_emergency_threshold(): return float(get_policy("emergency_procurement").get("auto_authorize_under_usd",150000))
