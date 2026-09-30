"""Compatibility facade for the deterministic security engine."""
from .engine import evaluate_request as _evaluate, secure_tool_call
SENSITIVE_KEYWORDS={"password","api_key","api key","secret","credit_card","credit card","private_key","private key","internal_financial_data","internal financial data","supplier_pricing","supplier pricing"}
def contains_sensitive_request(text):
    return any(k in str(text or "").lower() for k in SENSITIVE_KEYWORDS)
def evaluate_request(agent_id,action,resource,parameters=None,context=None):
    # Preserve the old three-argument API used by existing tests/callers.
    if parameters is None and context is None:
        r=_evaluate(agent_id,action,"request",{"source":"legacy_request","request":resource},{})
        return {**r,"decision":"ALLOWED" if r["decision"]=="ALLOW" else "DENIED"}
    return _evaluate(agent_id,action,resource,parameters,context)
