import asyncio

from services import recovery_service


def test_recovery_orchestration_uses_real_source_data(monkeypatch):
    async def fake_agent(agent_id, prompt):
        return {"success": True, "agent_id": agent_id, "text": f"verified {agent_id}"}

    monkeypatch.setattr(recovery_service, "_run_adk_agent", fake_agent)
    result = asyncio.run(recovery_service.run_recovery("SHP001"))

    assert result["source"] == "real_adk_and_deterministic_tools"
    assert result["incident"]["delayDays"] == 6
    assert result["incident"]["runwayDays"] == 3.31
    assert result["decision"]["status"] == "SELECTED"
    assert result["incident"]["status"] == "RESOLVED"
    assert result["incident"]["activeRouteId"] == "R002"
    assert result["purchaseOrders"] == []
    assert result["finance"]["committedSpend"] == 52000
    assert result["decision"]["evidence"][-1]["finding"] == "Acceptable — feasible plan found"
    assert result["adk"]["executed"] is True
    assert all(v["success"] for v in result["adk"]["agentResults"].values())
