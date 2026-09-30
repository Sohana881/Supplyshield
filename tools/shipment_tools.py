import pandas as pd
from pathlib import Path


DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "shipments.csv"
)


def load_shipments():
    """Load shipment data."""
    return pd.read_csv(DATA_PATH)


def get_shipment(shipment_id: str):
    """Get details of a specific shipment."""

    df = load_shipments()

    result = df[
        df["shipment_id"].astype(str) == str(shipment_id)
    ]

    if result.empty:
        return {
            "shipment_id": shipment_id,
            "status": "SHIPMENT_NOT_FOUND"
        }

    return result.iloc[0].to_dict()


def get_delayed_shipments():
    """Return all currently delayed shipments."""

    df = load_shipments()

    result = df[
        df["status"].astype(str).str.upper() == "DELAYED"
    ]

    return result.to_dict(orient="records")


def calculate_delay(shipment_id: str):
    """Calculate the number of days a shipment is delayed."""

    shipment = get_shipment(shipment_id)

    if shipment.get("status") == "SHIPMENT_NOT_FOUND":
        return shipment

    original_eta = pd.to_datetime(
        shipment["original_eta"]
    )

    current_eta = pd.to_datetime(
        shipment["current_eta"]
    )

    delay_days = (
        current_eta - original_eta
    ).days

    return {
        "shipment_id": shipment_id,
        "original_eta": shipment["original_eta"],
        "current_eta": shipment["current_eta"],
        "delay_days": delay_days,
        "status": shipment["status"]
    }


def get_shipment_risk(shipment_id: str):
    """
    Evaluate shipment disruption severity.
    """

    shipment = get_shipment(shipment_id)

    if shipment.get("status") == "SHIPMENT_NOT_FOUND":
        return shipment

    delay = calculate_delay(shipment_id)

    delay_days = delay["delay_days"]

    if shipment["temperature_status"] != "STABLE":
        risk = "CRITICAL"
    elif delay_days >= 7:
        risk = "CRITICAL"
    elif delay_days >= 4:
        risk = "HIGH"
    elif delay_days >= 2:
        risk = "MEDIUM"
    elif delay_days > 0:
        risk = "LOW"
    else:
        risk = "NONE"

    return {
        "shipment_id": shipment_id,
        "product_id": shipment["product_id"],
        "quantity_units": shipment["quantity_units"],
        "delay_days": delay_days,
        "temperature_status": shipment["temperature_status"],
        "risk_level": risk
    }