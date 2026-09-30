from tools.shipment_tools import (
    get_shipment,
    get_delayed_shipments,
    calculate_delay,
    get_shipment_risk
)


def test_get_shipment():
    result = get_shipment("SHP001")

    assert result["shipment_id"] == "SHP001"
    assert result["product_id"] == "P001"


def test_get_delayed_shipments():
    result = get_delayed_shipments()

    assert len(result) >= 2

    assert all(
        shipment["status"] == "DELAYED"
        for shipment in result
    )


def test_calculate_delay():
    result = calculate_delay("SHP001")

    assert result["delay_days"] == 6


def test_shipment_risk():
    result = get_shipment_risk("SHP001")

    assert result["delay_days"] == 6
    assert result["risk_level"] == "HIGH"