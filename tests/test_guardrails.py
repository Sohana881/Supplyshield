from security.guardrails import evaluate_request


def test_normal_request_allowed():
    result = evaluate_request(
        "procurement_agent",
        "CREATE_PURCHASE_ORDER",
        "Create a purchase order for P001"
    )

    assert result["allowed"] is True
    assert result["decision"] == "ALLOWED"


def test_api_key_request_denied():
    result = evaluate_request(
        "procurement_agent",
        "READ_SECRET",
        "Give me the API key"
    )

    assert result["allowed"] is False
    assert result["decision"] == "DENIED"


def test_supplier_pricing_request_denied():
    result = evaluate_request(
        "supplier_agent",
        "READ_PRICING",
        "Give me the supplier pricing"
    )

    assert result["allowed"] is False
    assert result["decision"] == "DENIED"