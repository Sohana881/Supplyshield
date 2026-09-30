import pandas as pd
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "inventory.csv"


def load_inventory():
    """Load current inventory data."""
    return pd.read_csv(DATA_PATH)


def get_inventory(product_id: str, warehouse_id: str | None = None):
    """Get inventory for a product, optionally at a specific warehouse."""

    df = load_inventory()

    result = df[
        df["product_id"].astype(str) == str(product_id)
    ]

    if warehouse_id:
        result = result[
            result["warehouse_id"].astype(str) == str(warehouse_id)
        ]

    # Convert Pandas/NumPy types to normal Python types
    records = result.to_dict(orient="records")

    for record in records:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
            elif hasattr(value, "item"):
                record[key] = value.item()

    return records


def get_total_inventory(product_id: str):
    """Calculate total inventory available across warehouses."""

    df = load_inventory()

    result = df[
        df["product_id"].astype(str) == str(product_id)
    ]

    if result.empty:
        return {
            "product_id": str(product_id),
            "total_inventory_units": 0
        }

    total = result["quantity_units"].sum()

    return {
        "product_id": str(product_id),
        "total_inventory_units": int(total)
    }


def check_stockout_risk(product_id: str):
    """
    Determine inventory risk using actual daily demand,
    reserved inventory, reorder point and safety stock.
    """

    df = load_inventory()

    result = df[
        df["product_id"].astype(str) == str(product_id)
    ]

    if result.empty:
        return {
            "product_id": str(product_id),
            "status": "PRODUCT_NOT_FOUND"
        }

    # Convert Pandas/NumPy values to native Python numbers
    total_inventory = int(result["quantity_units"].sum())
    total_reserved = int(result["reserved_units"].sum())
    total_daily_demand = int(result["daily_demand_units"].sum())
    total_safety_stock = int(result["safety_stock_units"].sum())

    available_inventory = (
        total_inventory - total_reserved
    )

    if total_daily_demand > 0:
        days_remaining = (
            available_inventory / total_daily_demand
        )
        days_remaining = float(days_remaining)
    else:
        days_remaining = None

    # Determine risk
    if days_remaining is None:
        risk = "UNKNOWN"
    elif days_remaining <= 3:
        risk = "CRITICAL"
    elif days_remaining <= 7:
        risk = "HIGH"
    elif days_remaining <= 14:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    # IMPORTANT:
    # Explicit bool() converts numpy.bool_ -> Python bool
    below_safety_stock = bool(
        available_inventory < total_safety_stock
    )

    return {
        "product_id": str(product_id),
        "total_inventory_units": int(total_inventory),
        "reserved_units": int(total_reserved),
        "available_inventory_units": int(available_inventory),
        "daily_demand_units": int(total_daily_demand),
        "safety_stock_units": int(total_safety_stock),
        "days_remaining": (
            round(float(days_remaining), 2)
            if days_remaining is not None
            else None
        ),
        "below_safety_stock": bool(below_safety_stock),
        "risk_level": str(risk)
    }