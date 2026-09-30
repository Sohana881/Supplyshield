import pandas as pd
from pathlib import Path


DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "routes.csv"
)


def load_routes():
    """Load logistics route data."""
    return pd.read_csv(DATA_PATH)


def get_route(route_id: str):
    """Get details of a specific route."""

    df = load_routes()

    result = df[
        df["route_id"].astype(str) == str(route_id)
    ]

    if result.empty:
        return {
            "route_id": route_id,
            "status": "ROUTE_NOT_FOUND"
        }

    return result.iloc[0].to_dict()


def get_available_routes(
    destination: str,
    required_capacity: int = 0
):
    """
    Find available routes to a destination
    with enough transport capacity.
    """

    df = load_routes()

    result = df[
        (df["destination"].astype(str).str.lower()
         == destination.lower())
        & (df["status"].astype(str).str.upper()
           == "AVAILABLE")
        & (df["capacity_units"] >= required_capacity)
    ].copy()

    return result.to_dict(orient="records")


def evaluate_route(route_id: str):
    """
    Evaluate a route based on transit time,
    cost, risk and capacity.
    """

    route = get_route(route_id)

    if route.get("status") == "ROUTE_NOT_FOUND":
        return route

    transit_days = route["transit_days"]
    cost = route["cost_usd"]
    risk_score = route["risk_score"]
    capacity = route["capacity_units"]

    if risk_score >= 0.30:
        risk_level = "CRITICAL"
    elif risk_score >= 0.20:
        risk_level = "HIGH"
    elif risk_score >= 0.10:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "route_id": route_id,
        "origin": route["origin"],
        "destination": route["destination"],
        "mode": route["mode"],
        "carrier": route["carrier"],
        "transit_days": int(transit_days),
        "cost_usd": float(cost),
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "capacity_units": int(capacity),
        "status": route["status"]
    }


def find_best_routes(
    destination: str,
    required_capacity: int = 0,
    maximum_transit_days: int = 14
):
    """
    Rank available routes using transit time,
    cost, risk and capacity.
    """

    df = load_routes()

    candidates = df[
        (df["destination"].astype(str).str.lower()
         == destination.lower())
        & (df["status"].astype(str).str.upper()
           == "AVAILABLE")
        & (df["capacity_units"] >= required_capacity)
        & (df["transit_days"] <= maximum_transit_days)
    ].copy()

    if candidates.empty:
        return []

    # Lower transit, cost and risk = better.
    candidates["route_score"] = (
        (1 - candidates["risk_score"]) * 50
        + (1 / (candidates["transit_days"] + 1)) * 30
        + (1 / (candidates["cost_usd"] + 1)) * 20
    )

    candidates = candidates.sort_values(
        "route_score",
        ascending=False
    )

    return candidates.to_dict(orient="records")