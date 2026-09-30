from datetime import datetime
import uuid


def generate_event(
    event_type: str,
    payload: dict,
    event_id: str | None = None
):
    """Generate a structured simulation event."""

    return {
        "event_id": event_id or str(uuid.uuid4()),
        "event_type": str(event_type),
        "timestamp": datetime.now().isoformat(),
        "payload": payload
    }


def generate_shipment_delay_event(
    shipment_id: str,
    delay_days: int = 6
):
    """Generate a shipment-delay disruption."""

    return generate_event(
        event_type="SHIPMENT_DELAYED",
        event_id=f"DELAY-{shipment_id}",
        payload={
            "shipment_id": str(shipment_id),
            "delay_days": int(delay_days)
        }
    )


def generate_recovery_failure_event(
    shipment_id: str,
    reason: str = "Selected recovery option failed",
    additional_delay_days: int = 3
):
    """Generate a failed recovery event."""

    return generate_event(
        event_type="RECOVERY_FAILED",
        event_id=f"RECOVERY-FAIL-{shipment_id}",
        payload={
            "shipment_id": str(shipment_id),
            "reason": str(reason),
            "additional_delay_days": int(additional_delay_days)
        }
    )


def generate_security_event(
    request: str
):
    """Generate an unauthorized-request event."""

    return generate_event(
        event_type="UNAUTHORIZED_REQUEST",
        event_id="SECURITY-001",
        payload={
            "request": str(request)
        }
    )