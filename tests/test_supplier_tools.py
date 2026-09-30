from tools.supplier_tools import (
    get_suppliers_for_product,
    get_supplier,
    find_supplier_options
)


def test_get_suppliers_for_product():
    result = get_suppliers_for_product("P001")

    assert len(result) > 0
    assert all(
        supplier["product_id"] == "P001"
        for supplier in result
    )


def test_get_supplier():
    result = get_supplier("SUP001")

    assert result["supplier_id"] == "SUP001"
    assert result["supplier_name"] == "EuroMed Components"


def test_find_supplier_options():
    result = find_supplier_options(
        product_id="P001",
        required_quantity=5000,
        maximum_lead_time_days=14
    )

    assert len(result) > 0

    for supplier in result:
        assert supplier["capacity_units"] >= 5000
        assert supplier["lead_time_days"] <= 14
        assert supplier["reliability_score"] >= 0.85