"""Deterministic security policy engine. It always runs before sensitive tool execution."""
from typing import Any,Callable
from .models import SecurityDecision,new_audit_id,timestamp
from .permissions import get_agent_policy,has_permission
from .policies import load_policy_config
from .audit import write_audit
SENSITIVE={"supplier_database","finance_database","customer_database","internal_enterprise_dataset","supplier_data_export","financial_data_export","customer_data_export"}
EXTERNAL={"external","external_url","external_destination","public_url"}
def _n(v): return str(v or "").strip().lower()
def _audit(d,ctx,params):
    safe={k:v for k,v in (params or {}).items() if k.lower() not in {"payload","data","rows","records","content","secret","token","password","api_key","message"}}
    write_audit({**d.to_dict(),"incidentId":ctx.get("incidentId"),"tool":ctx.get("tool") or d.action,"result":d.decision,"policy":d.policy_id,"approvalRequired":d.approval_required,"requestParameters":safe})
def evaluate_request(agent_id,action,resource,parameters=None,context=None):
    parameters=parameters or {}; context=context or {}; action=str(action).upper(); resource=str(resource); aid=str(agent_id)
    cfg=load_policy_config(); audit_id=new_audit_id(); ts=timestamp()
    src=parameters.get("source") or context.get("source"); dest=parameters.get("destination") or context.get("destination")
    sensitive=_n(resource) in SENSITIVE or ("database" in _n(resource) and any(x in _n(resource) for x in ("finance","supplier","customer")))
    external=_n(dest) in EXTERNAL or _n(dest).startswith(("http://","https://"))
    if sensitive and external:
        d=SecurityDecision(False,"BLOCK","External destinations cannot receive sensitive enterprise data.","SENSITIVE_DATA_EXPORT",aid,action,resource,ts,audit_id,False,src,dest,"CRITICAL")
    elif not has_permission(aid,action):
        d=SecurityDecision(False,"BLOCK",f"Agent '{aid}' is not authorized for action '{action}'.","AGENT_PERMISSION",aid,action,resource,ts,audit_id,False,src,dest,"HIGH")
    elif action in {"EMERGENCY_PROCUREMENT","AUTHORIZE_EMERGENCY_SPEND"}:
        amount=float(parameters.get("amount_usd",0)); threshold=float(cfg["emergency_procurement"].get("auto_authorize_under_usd",150000))
        if aid!="finance_agent": d=SecurityDecision(False,"BLOCK","Only Finance Agent may authorize emergency procurement.","EMERGENCY_PROCUREMENT_AUTH",aid,action,resource,ts,audit_id,False,src,dest,"HIGH")
        elif amount<threshold: d=SecurityDecision(True,"ALLOW",f"Emergency procurement under ${threshold:,.0f} is auto-authorized.","EMERGENCY_PROCUREMENT_AUTH",aid,action,resource,ts,audit_id,False,src,dest)
        else: d=SecurityDecision(False,"REQUIRE_APPROVAL",f"Emergency procurement of ${amount:,.2f} meets/exceeds the ${threshold:,.0f} approval threshold.","EMERGENCY_PROCUREMENT_AUTH",aid,action,resource,ts,audit_id,True,src,dest,"WARNING")
    elif action=="SELECT_ROUTE":
        risk=str(parameters.get("risk_level","")).upper(); allowed={str(x).upper() for x in cfg["route_selection"].get("auto_allowed_risk_levels",["LOW","MEDIUM"])}
        if risk in allowed: d=SecurityDecision(True,"ALLOW",f"Route risk {risk} is within Logistics Agent authority.","ROUTE_SELECTION_AUTH",aid,action,resource,ts,audit_id)
        elif risk=="HIGH": d=SecurityDecision(False,"REQUIRE_APPROVAL","High-risk routes require explicit approval.","ROUTE_SELECTION_AUTH",aid,action,resource,ts,audit_id,True,src,dest,"WARNING")
        else: d=SecurityDecision(False,"BLOCK","Unknown route risk level is not authorized.","ROUTE_SELECTION_AUTH",aid,action,resource,ts,audit_id)
    else:
        d=SecurityDecision(True,"ALLOW","Action is permitted by the centralized agent policy.","AGENT_PERMISSION",aid,action,resource,ts,audit_id,False,src,dest)
    result=d.to_dict(); _audit(d,context,parameters); return result
def secure_tool_call(agent_id,action,resource,parameters=None,context=None,executor:Callable[...,Any]|None=None):
    decision=evaluate_request(agent_id,action,resource,parameters,context)
    if decision["decision"]!="ALLOW": return decision
    if executor is None: return decision
    try: return {**decision,"execution":executor(**(parameters or {}))}
    except Exception as exc: return {**decision,"allowed":False,"decision":"BLOCK","reason":"Tool execution failed after authorization.","execution_error":str(exc)}
