"""Real SupplyShield recovery orchestration.

The deterministic tools are the source of truth for numbers and policy. Google
ADK agents provide domain analysis and synthesis around those verified facts.
No frontend state is used to manufacture recovery results.
"""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd

from tools.finance_tools import check_budget
from tools.inventory_tools import check_stockout_risk, get_inventory, get_total_inventory
from tools.logistics_tools import find_best_routes
from tools.procurement_tools import create_purchase_order, update_shipment
from tools.shipment_tools import calculate_delay, get_shipment, get_shipment_risk
from tools.supplier_tools import find_supplier_options
from security.guardrails import evaluate_request
from security.engine import secure_tool_call

logger = logging.getLogger("supplyshield.recovery")
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

AGENT_META = {
    "command": ("Command Agent", "Orchestration"),
    "inventory": ("Inventory Agent", "Inventory Analysis"),
    "shipment": ("Shipment Agent", "Shipment Analysis"),
    "supplier": ("Supplier Agent", "Supplier Sourcing"),
    "risk": ("Risk Agent", "Risk Modeling"),
    "finance": ("Finance Agent", "Budget & Policy"),
    "logistics": ("Logistics Agent", "Routing & Transport"),
    "procurement": ("Procurement Agent", "Purchase Execution"),
}


def _native(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _native(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_native(v) for v in value]
    if hasattr(value, "item") and callable(value.item):
        try:
            return value.item()
        except (ValueError, TypeError):
            pass
    return value


def _now() -> str:
    return datetime.now(timezone.utc).astimezone().strftime("%H:%M")


def _agent_prompt(agent_id: str, context: str) -> str:
    prompts = {
        "inventory": f"""Analyze this disruption using ONLY your inventory tools and actual data.\n\n{context}\n\nReturn concise verified findings with product ID, available inventory, daily demand, days remaining, safety stock and risk.""",
        "shipment": f"""Analyze this disruption using ONLY your shipment tools and actual data.\n\n{context}\n\nReturn concise verified findings with shipment status, delay, temperature and risk.""",
        "supplier": f"""Analyze emergency supplier options using ONLY your supplier tools and actual data.\n\n{context}\n\nReturn candidate supplier IDs, lead times, capacity, unit prices, reliability, risk and estimated cost for the required quantity.""",
        "logistics": f"""Analyze transportation options using ONLY your logistics tools and actual data.\n\n{context}\n\nReturn candidate routes, transit time, capacity, cost, risk and the best available route(s).""",
        "finance": f"""Evaluate the proposed recovery cost using ONLY your finance tools and the supplied verified facts.\n\n{context}\n\nDo not approve a value that violates policy. Return the policy result and reason.""",
        "risk": f"""Score the recovery options using ONLY these verified findings. Do not invent data.\n\n{context}\n\nReturn overall risk, score 0-100, key drivers and rejected options.""",
        "procurement": f"""Review the procurement requirement using ONLY the supplied verified facts and your procurement tools.\n\n{context}\n\nIf finance policy does not permit execution, explicitly state that no PO should be executed. Never bypass policy.""",
    }
    return prompts[agent_id]


async def _run_adk_agent(agent_id: str, prompt: str) -> dict[str, Any]:
    """Run a real Google ADK agent and return its final text.

    ADK is imported lazily so the deterministic HTTP/data endpoints remain
    usable for health checks even before the optional AI dependency is loaded.
    """
    try:
        from google.adk.runners import InMemoryRunner
    except Exception as exc:  # pragma: no cover - environment dependent
        return {"success": False, "error": f"Google ADK is unavailable: {exc}"}

    agents = {
        "inventory": "agents.inventory_agent.agent",
        "shipment": "agents.shipment_agent.agent",
        "supplier": "agents.supplier_agent.agent",
        "logistics": "agents.logistics_agent.agent",
        "finance": "agents.finance_agent.agent",
        "risk": "agents.risk_agent.agent",
        "procurement": "agents.procurement_agent.agent",
        "command": "agents.command_agent.agent",
    }

    try:
        module = __import__(agents[agent_id], fromlist=["root_agent"])
        agent = module.root_agent
        runner = InMemoryRunner(agent=agent, app_name="supplyshield")
        response = await runner.run_debug(
            prompt,
            user_id="supplyshield-api",
            session_id=f"recovery-{agent_id}",
            quiet=True,
        )
        if response is None:
            text = ""
        elif isinstance(response, str):
            text = response
        elif hasattr(response, "text"):
            text = response.text or ""
        elif hasattr(response, "content"):
            content = response.content
            parts = getattr(content, "parts", None) or []
            text = "\n".join(getattr(part, "text", "") or "" for part in parts)
        else:
            text = str(response)
        return {"success": True, "text": text.strip(), "agent_id": agent_id}
    except Exception as exc:  # pragma: no cover - external API/runtime dependent
        logger.exception("ADK agent %s failed", agent_id)
        return {"success": False, "error": str(exc), "agent_id": agent_id}


def _load_policies() -> dict[str, Any]:
    return json.loads((DATA / "policies.json").read_text(encoding="utf-8"))


def _build_verified_context(shipment_id: str, exclude_supplier_ids: set[str] | None = None, exclude_route_ids: set[str] | None = None) -> dict[str, Any]:
    shipment = _native(get_shipment(shipment_id))
    if shipment.get("status") == "SHIPMENT_NOT_FOUND":
        raise ValueError(f"Shipment {shipment_id} was not found")

    product_id = str(shipment["product_id"])
    delay = _native(calculate_delay(shipment_id))
    shipment_risk = _native(get_shipment_risk(shipment_id))
    inventory_risk = _native(check_stockout_risk(product_id))
    inventory_rows = _native(get_inventory(product_id))

    available = int(inventory_risk.get("available_inventory_units", 0))
    daily_demand = int(inventory_risk.get("daily_demand_units", 0))
    delay_days = int(delay.get("delay_days", 0))

    # Minimum incremental quantity needed to cover the delayed interval.
    required_quantity = max(0, daily_demand * max(delay_days, 1) - available + 1)

    suppliers = _native(find_supplier_options(product_id, required_quantity, 14))
    routes = _native(find_best_routes(
        str(shipment["destination"]),
        required_quantity,
        max(14, int(inventory_risk.get("days_remaining") or 0) + 14),
    ))

    exclude_supplier_ids = exclude_supplier_ids or set()
    exclude_route_ids = exclude_route_ids or set()
    suppliers = [x for x in suppliers if str(x.get("supplier_id")) not in exclude_supplier_ids]
    routes = [x for x in routes if str(x.get("route_id")) not in exclude_route_ids]

    policies = _load_policies()
    emergency = policies.get("emergency_procurement", {})
    max_order = float(emergency.get("max_single_order_usd", 0))
    approval_threshold = float(
        emergency.get(
            "requires_human_approval_at_or_above_usd",
            emergency.get("requires_finance_approval_above_usd",
                          emergency.get("auto_authorize_under_usd", 0))
        )
    )

    # First consider expediting part/all of the delayed shipment itself.
    # We only need enough replacement capacity to bridge the inventory runway,
    # not necessarily the full delayed shipment quantity. The route must still
    # originate where the delayed shipment currently originates.
    shipment_routes = _native(find_best_routes(
        str(shipment["destination"]),
        int(required_quantity),
        max(1, int(math.ceil(float(inventory_risk.get("days_remaining") or 0))))
    ))
    excluded_route_ids = exclude_route_ids or set()
    shipment_routes = [
        r for r in shipment_routes
        if str(r.get("origin", "")).strip().lower() == str(shipment.get("origin", "")).strip().lower()
        and str(r.get("route_id")) not in excluded_route_ids
    ]

    route_recovery_options = []
    for route in shipment_routes:
        route_cost = float(route["cost_usd"])
        bridge_quantity = min(int(shipment["quantity_units"]), int(route["capacity_units"]))
        policy_ok = route_cost <= max_order
        auto_authorized = route_cost < approval_threshold
        runway_ok = int(route["transit_days"]) <= float(inventory_risk.get("days_remaining") or math.inf)
        capacity_ok = bridge_quantity >= required_quantity
        route_recovery_options.append({
            "route": route,
            "bridge_quantity": bridge_quantity,
            "route_cost_usd": round(route_cost, 2),
            "total_recovery_cost_usd": round(route_cost, 2),
            "total_days": int(route["transit_days"]),
            "policy_ok": policy_ok,
            "auto_authorized": auto_authorized,
            "runway_ok": runway_ok,
            "capacity_ok": capacity_ok,
            "feasible": policy_ok and auto_authorized and runway_ok and capacity_ok,
            "strategy": "REROUTE_EXISTING_SHIPMENT",
        })

    route_recovery_options.sort(key=lambda x: (
        not x["feasible"],
        not x["runway_ok"],
        x["total_days"],
        x["total_recovery_cost_usd"],
    ))

    combinations = []
    for supplier in suppliers:
        supplier_cost = float(supplier["unit_price_usd"]) * required_quantity
        for route in routes:
            total_recovery_cost = supplier_cost + float(route["cost_usd"])
            total_days = int(supplier["lead_time_days"]) + int(route["transit_days"])
            policy_ok = supplier_cost <= max_order
            auto_authorized = supplier_cost <= approval_threshold
            runway_ok = total_days <= float(inventory_risk.get("days_remaining") or math.inf)
            combinations.append({
                "supplier": supplier,
                "route": route,
                "supplier_cost_usd": round(supplier_cost, 2),
                "total_recovery_cost_usd": round(total_recovery_cost, 2),
                "total_days": total_days,
                "policy_ok": policy_ok,
                "auto_authorized": auto_authorized,
                "runway_ok": runway_ok,
                "feasible": policy_ok and auto_authorized and runway_ok,
            })

    combinations.sort(key=lambda x: (
        not x["feasible"],
        not x["runway_ok"],
        not x["policy_ok"],
        x["total_days"],
        x["total_recovery_cost_usd"],
    ))

    return {
        "shipment": shipment,
        "delay": delay,
        "shipment_risk": shipment_risk,
        "inventory_risk": inventory_risk,
        "inventory_rows": inventory_rows,
        "required_quantity": required_quantity,
        "suppliers": suppliers,
        "routes": routes,
        "combinations": combinations[:12],
        "route_recovery_options": route_recovery_options[:6],
        "policy": {
            "max_single_order_usd": max_order,
            "finance_approval_above_usd": approval_threshold,
            "emergency_budget_usd": float(emergency.get("emergency_budget_usd", max_order)),
        },
    }


def _make_timeline(verified: dict[str, Any], agent_results: dict[str, Any], final: dict[str, Any]) -> list[dict[str, Any]]:
    shipment = verified["shipment"]
    inventory = verified["inventory_risk"]
    delay = verified["delay"]
    lines = [
        {"time": _now(), "agent": "SYSTEM", "action": f"Shipment {shipment['shipment_id']} loaded from source data", "tool": "get_shipment()", "result": f"Status={shipment['status']}, delay={delay.get('delay_days', 0)}d"},
        {"time": _now(), "agent": "Shipment Agent", "action": "Completed shipment disruption analysis", "tool": "get_shipment_risk()", "result": f"Risk={verified['shipment_risk'].get('risk_level', 'UNKNOWN')}"},
        {"time": _now(), "agent": "Inventory Agent", "action": "Completed inventory runway analysis", "tool": "check_stockout_risk()", "result": f"{inventory.get('days_remaining')} days remaining; required recovery quantity={verified['required_quantity']}"},
        {"time": _now(), "agent": "Supplier Agent", "action": "Evaluated real supplier candidates", "tool": "find_supplier_options()", "result": f"{len(verified['suppliers'])} candidates meet supplier filters"},
        {"time": _now(), "agent": "Logistics Agent", "action": "Evaluated real transport routes", "tool": "find_best_routes()", "result": f"{len(verified['routes'])} routes available to {shipment['destination']}"},
    ]
    if "finance" in agent_results:
        lines.append({"time": _now(), "agent": "Finance Agent", "action": "Evaluated emergency procurement policy", "tool": "check_budget()", "result": final["finance_result"]})
    lines.append({"time": _now(), "agent": "Risk Agent", "action": "Scored recovery feasibility", "tool": "risk_agent", "result": final["risk_summary"]})
    lines.append({"time": _now(), "agent": "Procurement Agent", "action": "Validated execution eligibility", "tool": "create_purchase_order()", "result": final["procurement_result"]})
    lines.append({"time": _now(), "agent": "Command Agent", "action": "Synthesized specialist findings", "tool": "ADK orchestration", "result": final["recommendation"]})
    return lines


async def run_recovery(shipment_id: str, exclude_supplier_ids: list[str] | None = None, exclude_route_ids: list[str] | None = None) -> dict[str, Any]:
    guard = evaluate_request("command_agent", "AUTONOMOUS_RECOVERY", "shipment_context", {"shipment_id": shipment_id}, {"incidentId": shipment_id, "source": "agent_workflow"})
    if not guard.get("allowed"):
        raise PermissionError(guard.get("reason", "Recovery request denied by guardrails"))
    verified = _build_verified_context(shipment_id, set(exclude_supplier_ids or []), set(exclude_route_ids or []))
    shipment = verified["shipment"]
    product_id = str(shipment["product_id"])
    required = verified["required_quantity"]

    base_context = json.dumps({
        "shipment": verified["shipment"],
        "delay": verified["delay"],
        "shipment_risk": verified["shipment_risk"],
        "inventory_risk": verified["inventory_risk"],
        "required_quantity": required,
        "policy": verified["policy"],
    }, default=str)

    # The domain agents run concurrently because their verified tools are read-only.
    domain_ids = ["inventory", "shipment", "supplier", "logistics"]
    domain_results_list = await asyncio.gather(*[
        _run_adk_agent(agent_id, _agent_prompt(agent_id, base_context))
        for agent_id in domain_ids
    ])
    agent_results = dict(zip(domain_ids, domain_results_list))
    domain_failures = [k for k, v in agent_results.items() if not v.get("success")]
    if domain_failures:
        raise RuntimeError("Required ADK domain agents failed: " + ", ".join(domain_failures))

    best = verified["combinations"][0] if verified["combinations"] else None
    best_reroute = next((x for x in verified["route_recovery_options"] if x["feasible"]), None)
    finance_candidate = (
        best_reroute["route_cost_usd"]
        if best_reroute
        else (best["supplier_cost_usd"] if best else 0)
    )
    finance_context = json.dumps({
        "recovery_strategy": "REROUTE_EXISTING_SHIPMENT" if best_reroute else "EMERGENCY_PROCUREMENT",
        "candidate_supplier": best["supplier"] if best else None,
        "supplier_purchase_cost_usd": best["supplier_cost_usd"] if best else None,
        "route_cost_usd": best_reroute["route_cost_usd"] if best_reroute else (best["route"]["cost_usd"] if best else None),
        "policy": verified["policy"],
        "required_quantity": required,
    }, default=str)
    finance_result = await _run_adk_agent("finance", _agent_prompt("finance", finance_context))
    agent_results["finance"] = finance_result
    if not finance_result.get("success"):
        raise RuntimeError("Finance Agent failed: " + str(finance_result.get("error", "unknown error")))

    # Source-of-truth policy gate. The model never gets to bypass this.
    budget = check_budget("finance_agent", finance_candidate, "EMERGENCY_PROCUREMENT") if (best_reroute or best) else {
        "approved": False,
        "amount_usd": 0,
        "reason": "No recovery candidate available",
    }
    reroute_feasible = bool(best_reroute and budget.get("approved"))
    feasible = best if (not reroute_feasible and best and best["feasible"] and budget.get("approved")) else None

    risk_context = json.dumps({
        "inventory": verified["inventory_risk"],
        "shipment": verified["shipment_risk"],
        "supplier_options": verified["suppliers"],
        "route_options": verified["routes"],
        "candidate_combinations": verified["combinations"],
        "route_recovery_options": verified["route_recovery_options"],
        "finance_policy_result": budget,
    }, default=str)
    risk_result = await _run_adk_agent("risk", _agent_prompt("risk", risk_context))
    agent_results["risk"] = risk_result
    if not risk_result.get("success"):
        raise RuntimeError("Risk Agent failed: " + str(risk_result.get("error", "unknown error")))

    if reroute_feasible:
        procurement_result = {
            "success": True,
            "text": "No purchase order required: the delayed shipment can be safely rerouted within the inventory runway and finance policy.",
            "agent_id": "procurement",
        }
        agent_results["procurement"] = procurement_result
    elif feasible:
        procurement_context = json.dumps({
            "supplier": feasible["supplier"],
            "route": feasible["route"],
            "required_quantity": required,
            "supplier_cost_usd": feasible["supplier_cost_usd"],
            "finance_policy_result": budget,
        }, default=str)
        procurement_result = await _run_adk_agent("procurement", _agent_prompt("procurement", procurement_context))
        agent_results["procurement"] = procurement_result
        if not procurement_result.get("success"):
            raise RuntimeError("Procurement Agent failed: " + str(procurement_result.get("error", "unknown error")))
    else:
        procurement_result = {"success": True, "text": "No purchase order executed because no candidate passed both recovery feasibility and policy checks.", "agent_id": "procurement"}
        agent_results["procurement"] = procurement_result

    command_context = json.dumps({
        "verified_facts": verified,
        "finance_policy_result": budget,
        "specialist_findings": {k: v.get("text", v.get("error", "")) for k, v in agent_results.items()},
        "execution_rule": "Never execute a plan that violates the policy gate or cannot cover the remaining runway.",
    }, default=str)
    command_result = await _run_adk_agent("command", _agent_prompt("command", command_context) if False else f"""
You are the Command Agent. Synthesize this verified SupplyShield recovery analysis.
Use the specialist findings below. Do not invent or override deterministic policy.
Do not claim recovery succeeded unless the policy gate says it is feasible.

VERIFIED CONTEXT:
{command_context}

Return a concise recommendation with Situation Summary, Risk, Recommended Action and Reasoning.
""")
    agent_results["command"] = command_result
    if not command_result.get("success"):
        raise RuntimeError("Command Agent failed: " + str(command_result.get("error", "unknown error")))

    options = []
    for reroute in verified["route_recovery_options"][:3]:
        route = reroute["route"]
        options.append({
            "label": f"Expedite existing shipment via {route['route_id']}",
            "supplierId": None,
            "routeId": str(route["route_id"]),
            "cost": round(reroute["total_recovery_cost_usd"], 2),
            "etaDays": int(reroute["total_days"]),
            "risk": "Low" if float(route["risk_score"]) < 0.20 else "Medium" if float(route["risk_score"]) < 0.35 else "High",
            "stockout": not reroute["runway_ok"],
            "feasible": bool(reroute["feasible"] and budget.get("approved")),
            "strategy": "REROUTE_EXISTING_SHIPMENT",
            "note": "Meets runway and policy constraints" if reroute["feasible"] and budget.get("approved") else ("Requires finance approval" if not reroute["auto_authorized"] else "ETA exceeds remaining inventory runway"),
        })
    for combo in verified["combinations"][:6]:
        options.append({
            "label": str(combo["supplier"]["supplier_name"]),
            "supplierId": str(combo["supplier"]["supplier_id"]),
            "routeId": str(combo["route"]["route_id"]),
            "cost": round(combo["total_recovery_cost_usd"], 2),
            "etaDays": int(combo["total_days"]),
            "risk": "Low" if float(combo["supplier"]["risk_score"]) < 0.20 and float(combo["route"]["risk_score"]) < 0.20 else "Medium" if float(combo["supplier"]["risk_score"]) < 0.35 and float(combo["route"]["risk_score"]) < 0.35 else "High",
            "stockout": not combo["runway_ok"],
            "feasible": bool(combo["feasible"]),
            "note": "Meets runway and policy constraints" if combo["feasible"] else ("Fails emergency procurement policy" if not combo["policy_ok"] else "ETA exceeds remaining inventory runway"),
        })

    procurement = None
    if reroute_feasible:
        decision_status = "SELECTED"
        incident_status = "RESOLVED"
        active_supplier_id = None
        active_route_id = str(best_reroute["route"]["route_id"])
        recommendation = f"Expedite existing shipment {shipment_id} via route {active_route_id}; no new PO is required."
        route_gate = secure_tool_call(
            "logistics_agent", "SELECT_ROUTE", "routes",
            {"route_id": active_route_id, "risk_level": ("LOW" if float(best_reroute["route"].get("risk_score", 1)) < 0.20 else "MEDIUM" if float(best_reroute["route"].get("risk_score", 1)) < 0.35 else "HIGH")},
            {"incidentId": shipment_id, "source": "agent_workflow", "tool": "select_route"},
            lambda **kwargs: update_shipment(shipment_id, status="EXPEDITED", route_id=active_route_id, quantity_units=int(best_reroute["bridge_quantity"])),
        )
        route_execution = route_gate.get("execution") if route_gate.get("decision") == "ALLOW" else None
        if route_execution is None:
            reroute_feasible = False
            decision_status = "NO_FEASIBLE_PLAN"
            incident_status = "AT_RISK"
            active_route_id = None
            recommendation = route_gate.get("reason", "Route selection was blocked by security policy.")
        procurement_result_text = (
            "No PO required: existing shipment reroute selected."
            if route_execution else route_gate.get("reason", "Security policy blocked route selection.")
        )
    elif feasible:
        decision_status = "SELECTED"
        incident_status = "RESOLVED"
        active_supplier_id = str(feasible["supplier"]["supplier_id"])
        active_route_id = str(feasible["route"]["route_id"])
        recommendation = f"Use {feasible['supplier']['supplier_name']} with route {feasible['route']['route_id']}."
        procurement_gate = secure_tool_call(
            "procurement_agent", "CREATE_PURCHASE_ORDER", "purchase_orders",
            {"supplier_id": active_supplier_id, "product_id": product_id, "quantity": required,
             "unit_cost_usd": float(feasible["supplier"]["unit_price_usd"])},
            {"incidentId": shipment_id, "source": "agent_workflow", "tool": "create_purchase_order"},
            create_purchase_order,
        )
        procurement = procurement_gate.get("execution") if procurement_gate.get("decision") == "ALLOW" else None
        procurement_result_text = (
            f"PO proposal {procurement['purchase_order_id']} created after security authorization."
            if procurement else procurement_gate.get("reason", "Security policy blocked procurement.")
        )
        if procurement is None:
            feasible = None
    else:
        decision_status = "NO_FEASIBLE_PLAN"
        incident_status = "AT_RISK"
        active_supplier_id = None
        active_route_id = None
        recommendation = "No policy-compliant recovery can currently prevent the stockout. Escalate for an authorized supply/policy decision."
        procurement = None
        procurement_result_text = "No PO created: every candidate violates the policy gate or cannot cover the remaining runway."

    selected_recovery = bool(reroute_feasible or feasible)
    risk_summary = "Acceptable — feasible plan found" if selected_recovery else "High — no policy-compliant plan"
    final = {
        "decision_status": decision_status,
        "incident_status": incident_status,
        "active_supplier_id": active_supplier_id,
        "active_route_id": active_route_id,
        "recommendation": recommendation,
        "finance_result": budget.get("reason", "Policy evaluated"),
        "risk_summary": risk_summary,
        "procurement_result": procurement_result_text,
    }

    adk_failures = [k for k, v in agent_results.items() if not v.get("success")]
    decision = {
        "id": f"decision-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
        "title": recommendation,
        "status": decision_status,
        "supplierId": active_supplier_id,
        "routeId": active_route_id,
        "rationale": recommendation + " Source-of-truth policy and deterministic tool checks were applied before execution.",
        "options": options,
        "evidence": [
            {"agent": "Inventory Agent", "finding": f"{verified['inventory_risk'].get('days_remaining')} days remaining"},
            {"agent": "Shipment Agent", "finding": f"Shipment delay {verified['delay'].get('delay_days')} days"},
            {"agent": "Supplier Agent", "finding": f"{len(verified['suppliers'])} supplier candidates"},
            {"agent": "Logistics Agent", "finding": f"{len(verified['routes'])} route candidates"},
            {"agent": "Finance Agent", "finding": budget.get("reason", "Policy evaluated")},
            {"agent": "Risk Agent", "finding": risk_summary},
        ],
        "invalidated": False,
        "adkFailures": adk_failures,
    }

    agent_states = []
    for agent_id in ["command", "inventory", "supplier", "risk", "finance", "logistics", "procurement", "shipment"]:
        meta = AGENT_META[agent_id]
        result = agent_results.get(agent_id, {})
        agent_states.append({
            "id": agent_id,
            "name": meta[0],
            "role": meta[1],
            "connected": True,
            "status": "complete" if result.get("success", False) else "error",
            "task": "Completed real ADK analysis" if result.get("success", False) else f"ADK error: {result.get('error', 'unknown error')}",
            "tool": "ADK + deterministic tools",
            "lastAction": "Real agent execution completed" if result.get("success", False) else "Execution failed",
            "confidence": 0.9 if result.get("success", False) else 0.0,
        })

    return {
        "status": "success",
        "source": "real_adk_and_deterministic_tools",
        "shipmentId": shipment_id,
        "incident": {
            "id": shipment_id,
            "severity": str(verified["inventory_risk"].get("risk_level", "HIGH")).upper(),
            "title": f"Shipment {shipment_id} disruption",
            "sku": str(shipment["sku"]),
            "runwayDays": verified["inventory_risk"].get("days_remaining"),
            "delayDays": verified["delay"].get("delay_days", 0),
            "stockoutExposure": str(verified["inventory_risk"].get("risk_level", "HIGH")).upper(),
            "origin": str(shipment.get("origin", "")),
            "destination": str(shipment.get("destination", "")),
            "status": incident_status,
            "activeSupplierId": active_supplier_id,
            "activeRouteId": active_route_id,
            "replanCount": 0,
        },
        "agents": agent_states,
        "inventory": verified["inventory_rows"],
        "suppliers": verified["suppliers"],
        "routes": verified["routes"],
        "finance": {
            "emergencyBudget": verified["policy"].get("emergency_budget_usd", verified["policy"]["max_single_order_usd"]),
            "committedSpend": float(best_reroute["route_cost_usd"]) if reroute_feasible else (float(feasible["supplier_cost_usd"]) if feasible else 0),
            "policyThreshold": verified["policy"]["finance_approval_above_usd"],
            "maxSingleOrderUsd": verified["policy"]["max_single_order_usd"],
        },
        "purchaseOrders": [procurement] if procurement else [],
        "decision": decision,
        "timeline": _make_timeline(verified, agent_results, final),
        "auditEvents": [
            {"time": _now(), "agent": "SYSTEM", "action": "RECOVERY_RUN", "tool": "POST /api/recovery", "result": "Real ADK workflow executed", "policy": "SupplyShield"},
            {"time": _now(), "agent": "Finance Agent", "action": "POLICY_GATE", "tool": "check_budget", "result": budget.get("reason", ""), "policy": "Emergency Procurement Authorization"},
        ],
        "adk": {
            "executed": True,
            "agentResults": {k: {"success": v.get("success", False), "text": v.get("text", ""), "error": v.get("error")} for k, v in agent_results.items()},
            "commandSummary": command_result.get("text", ""),
        },
    }
