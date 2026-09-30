from dataclasses import dataclass,asdict
from datetime import datetime,timezone
import uuid
@dataclass
class SecurityDecision:
    allowed: bool; decision: str; reason: str; policy_id: str; agent: str; action: str; resource: str; timestamp: str; audit_id: str
    approval_required: bool=False; source: str|None=None; destination: str|None=None; severity: str="INFO"
    def to_dict(self): return asdict(self)
def new_audit_id(): return "sec-"+uuid.uuid4().hex[:12]
def timestamp(): return datetime.now(timezone.utc).isoformat()
