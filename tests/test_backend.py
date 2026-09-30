from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_health():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['data']['ok'] is True


def test_dashboard_uses_real_source_data():
    response = client.get('/api/dashboard')
    assert response.status_code == 200
    data = response.json()
    assert data['incident']['id'] == 'SHP001'
    assert data['incident']['delayDays'] == 6
    assert data['finance']['maxSingleOrderUsd'] == 250000


def test_agents_report_all_implementations():
    response = client.get('/api/agents')
    assert response.status_code == 200
    agents = {item['id']: item for item in response.json()}
    assert len(agents) == 8
    assert all(item['connected'] for item in agents.values())


def test_recovery_endpoint_contract(monkeypatch):
    async def fake_recovery(shipment_id, exclude_supplier_ids=None, exclude_route_ids=None):
        return {
            "status": "success",
            "source": "real_adk_and_deterministic_tools",
            "shipmentId": shipment_id,
            "incident": {"id": shipment_id, "status": "NO_FEASIBLE_PLAN"},
            "agents": [],
            "inventory": [],
            "suppliers": [],
            "routes": [],
            "finance": {},
            "purchaseOrders": [],
            "decision": {"id": "d1", "status": "NO_FEASIBLE_PLAN"},
            "timeline": [],
            "auditEvents": [],
            "adk": {"executed": True},
        }

    monkeypatch.setattr("backend.main.run_recovery", fake_recovery)
    response = client.post("/api/recovery", json={"shipment_id": "SHP001"})
    assert response.status_code == 200
    assert response.json()["shipmentId"] == "SHP001"
    assert response.json()["adk"]["executed"] is True
