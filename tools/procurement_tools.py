import pandas as pd
from pathlib import Path
from datetime import datetime


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "purchase_orders.csv"


def load_purchase_orders():
    """Load purchase order data."""

    if not DATA_PATH.exists():
        return pd.DataFrame()

    return pd.read_csv(DATA_PATH)


def get_purchase_orders():
    """Return all purchase orders."""

    df = load_purchase_orders()

    return df.to_dict(orient="records")


def get_purchase_order(po_id: str):
    """Find a purchase order by ID."""

    df = load_purchase_orders()

    if "purchase_order_id" not in df.columns:
        return {
            "found": False,
            "reason": "purchase_order_id column not found"
        }

    result = df[
        df["purchase_order_id"].astype(str) == str(po_id)
    ]

    if result.empty:
        return {
            "found": False,
            "purchase_order_id": po_id
        }

    return {
        "found": True,
        "purchase_order": result.iloc[0].to_dict()
    }


def create_purchase_order(
    supplier_id: str,
    product_id: str,
    quantity: int,
    unit_cost_usd: float,
    warehouse_id: str | None = None
):
    """
    Create a purchase-order proposal.

    This does not automatically spend money.
    Finance/policy approval should happen before execution.
    """

    total_cost = int(quantity) * float(unit_cost_usd)

    existing = load_purchase_orders()

    if (
        not existing.empty
        and "purchase_order_id" in existing.columns
    ):
        numbers = []

        for value in existing["purchase_order_id"].astype(str):
            try:
                numbers.append(int(value.replace("PO", "")))
            except ValueError:
                pass

        next_number = max(numbers, default=0) + 1
    else:
        next_number = 1

    po_id = f"PO{next_number:03d}"

    result = {
        "success": True,
        "purchase_order_id": po_id,
        "supplier_id": str(supplier_id),
        "product_id": str(product_id),
        "quantity": int(quantity),
        "unit_cost_usd": float(unit_cost_usd),
        "total_cost_usd": round(total_cost, 2),
        "warehouse_id": warehouse_id,
        "status": "PROPOSED",
        "created_at": datetime.now().isoformat()
    }

    return result


def update_purchase_order_status(
    po_id: str,
    status: str
):
    """Return a validated purchase-order status update."""

    allowed_statuses = {
        "PROPOSED",
        "PENDING_APPROVAL",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "COMPLETED"
    }

    status = status.upper()

    if status not in allowed_statuses:
        return {
            "success": False,
            "purchase_order_id": po_id,
            "reason": f"Invalid status: {status}"
        }

    return {
        "success": True,
        "purchase_order_id": str(po_id),
        "new_status": status
    }


def update_shipment(
    shipment_id: str,
    status: str | None = None,
    route_id: str | None = None,
    quantity_units: int | None = None
):
    """
    Create a shipment update proposal.

    Actual persistence can be connected later by P1/backend.
    """

    result = {
        "success": True,
        "shipment_id": str(shipment_id)
    }

    if status is not None:
        result["new_status"] = str(status)

    if route_id is not None:
        result["new_route_id"] = str(route_id)

    if quantity_units is not None:
        result["rerouted_quantity_units"] = int(quantity_units)

    return result