import pandas as pd
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "suppliers.csv"


def load_suppliers():
    """Load supplier data."""
    return pd.read_csv(DATA_PATH)


def get_suppliers_for_product(product_id: str):
    """Get all active suppliers for a product."""

    df = load_suppliers()

    result = df[
        (df["product_id"].astype(str) == str(product_id))
        & (df["status"] == "ACTIVE")
    ]

    return result.to_dict(orient="records")


def get_supplier(supplier_id: str):
    """Get details of one supplier."""

    df = load_suppliers()

    result = df[
        df["supplier_id"].astype(str) == str(supplier_id)
    ]

    if result.empty:
        return {
            "supplier_id": supplier_id,
            "status": "SUPPLIER_NOT_FOUND"
        }

    return result.iloc[0].to_dict()


def find_supplier_options(
    product_id: str,
    required_quantity: int,
    maximum_lead_time_days: int = 14
):
    """
    Find suppliers capable of fulfilling an emergency requirement.

    Filters suppliers based on:
    - product availability
    - active status
    - capacity
    - maximum acceptable lead time
    - reliability
    - quality
    """

    df = load_suppliers()

    candidates = df[
        (df["product_id"].astype(str) == str(product_id))
        & (df["status"] == "ACTIVE")
        & (df["capacity_units"] >= required_quantity)
        & (df["lead_time_days"] <= maximum_lead_time_days)
        & (df["reliability_score"] >= 0.85)
        & (df["quality_score"] >= 0.95)
    ].copy()

    if candidates.empty:
        return []

    # Calculate estimated total purchase cost
    candidates["estimated_cost_usd"] = (
        candidates["unit_price_usd"] * required_quantity
    )

    # Lower risk and shorter lead time are better.
    candidates["recommendation_score"] = (
        (candidates["reliability_score"] * 40)
        + (candidates["quality_score"] * 30)
        - (candidates["risk_score"] * 20)
        - (candidates["lead_time_days"] * 2)
    )

    candidates = candidates.sort_values(
        "recommendation_score",
        ascending=False
    )

    return candidates.to_dict(orient="records")