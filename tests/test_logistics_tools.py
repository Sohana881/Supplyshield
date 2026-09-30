from tools.logistics_tools import (
    get_route,
    get_available_routes,
    evaluate_route,
    find_best_routes
)


def test_get_route():
    result = get_route("R001")

    assert result["route_id"] == "R001"
    assert result["origin"] == "Hamburg"
    assert result["destination"] == "Genoa"


def test_get_available_routes():
    result = get_available_routes(
        destination="Genoa",
        required_capacity=5000
    )

    assert len(result) > 0

    for route in result:
        assert route["destination"] == "Genoa"
        assert route["status"] == "AVAILABLE"
        assert route["capacity_units"] >= 5000


def test_evaluate_route():
    result = evaluate_route("R001")

    assert result["transit_days"] == 6
    assert result["cost_usd"] == 18000
    assert result["risk_level"] == "HIGH"


def test_find_best_routes():
    result = find_best_routes(
        destination="Genoa",
        required_capacity=5000,
        maximum_transit_days=7
    )

    assert len(result) > 0

    for route in result:
        assert route["transit_days"] <= 7
        assert route["capacity_units"] >= 5000