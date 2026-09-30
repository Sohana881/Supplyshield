import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "policies.json"


def load_policies():
    """Load supply-chain policies."""
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def check_budget(agent_id: str, amount_usd: float, action: str):
    """
    Check whether an emergency procurement amount is within policy limits.
    """

    policies = load_policies()

    emergency_policy = policies.get("emergency_procurement", {})

    max_single_order = float(
        emergency_policy.get("max_single_order_usd", 0)
    )

    # Keep the finance tool aligned with the centralized policy schema.
    # Older builds used `requires_finance_approval_above_usd`, while the
    # security policy now uses `requires_human_approval_at_or_above_usd`.
    # Supporting both keys keeps old policy files readable without silently
    # turning the threshold into zero.
    finance_approval_threshold = float(
        emergency_policy.get(
            "requires_human_approval_at_or_above_usd",
            emergency_policy.get("requires_finance_approval_above_usd",
                                 emergency_policy.get("auto_authorize_under_usd", 0))
        )
    )

    amount = float(amount_usd)

    if amount > max_single_order:
        approved = False
        reason = "Amount exceeds maximum single emergency order limit"
    elif amount >= finance_approval_threshold:
        approved = False
        reason = "Within maximum order limit but requires finance approval"
    else:
        approved = True
        reason = "Within emergency procurement policy limits"

    return {
        "approved": bool(approved),
        "agent_id": str(agent_id),
        "action": str(action),
        "amount_usd": amount,
        "maximum_single_order_usd": max_single_order,
        "finance_approval_required_above_usd": finance_approval_threshold,
        "finance_approval_required": bool(
            amount > finance_approval_threshold
        ),
        "reason": reason,
    }


def calculate_total_cost(quantity: int, unit_cost_usd: float):
    """Calculate total procurement cost."""

    total = int(quantity) * float(unit_cost_usd)

    return {
        "quantity": int(quantity),
        "unit_cost_usd": float(unit_cost_usd),
        "total_cost_usd": round(total, 2),
    }