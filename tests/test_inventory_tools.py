from tools.inventory_tools import (
    get_inventory,
    get_total_inventory,
    check_stockout_risk
)


def test_get_inventory():
    result = get_inventory("P001")

    assert len(result) > 0
    assert result[0]["product_id"] == "P001"


def test_total_inventory():
    result = get_total_inventory("P001")

    assert result["total_inventory_units"] == 6000


def test_stockout_risk():
    result = check_stockout_risk("P001")

    assert result["available_inventory_units"] == 5300
    assert result["daily_demand_units"] == 1600
    assert result["risk_level"] == "HIGH"