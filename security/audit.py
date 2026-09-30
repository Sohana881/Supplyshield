"""Audit repository. Uses incidents/{incidentId}/audit/{auditId} in Firestore when enabled, JSONL locally."""
import json,os
from pathlib import Path
AUDIT_FILE=Path(__file__).resolve().parent/"audit_log.jsonl"
def _firestore_write(incident_id,audit_id,record):
    try:
        from google.cloud import firestore
        firestore.Client().collection("incidents").document(str(incident_id)).collection("audit").document(audit_id).set(record)
        return True
    except Exception: return False
def write_audit(record):
    if os.getenv("FIRESTORE_ENABLED","false").lower()=="true" and _firestore_write(record.get("incidentId","unscoped"),record["audit_id"],record): return record
    AUDIT_FILE.parent.mkdir(parents=True,exist_ok=True)
    with AUDIT_FILE.open("a",encoding="utf-8") as f: f.write(json.dumps(record,default=str)+"\n")
    return record
def read_audit_logs(incident_id=None):
    if not AUDIT_FILE.exists(): return []
    out=[]
    for line in AUDIT_FILE.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                r=json.loads(line)
                if incident_id is None or str(r.get("incidentId"))==str(incident_id): out.append(r)
            except json.JSONDecodeError: pass
    return out
