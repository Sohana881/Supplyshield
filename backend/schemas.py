"""
Pydantic schemas for the SupplyShield P2 API.

The schemas are intentionally small and stable. They describe the HTTP
contract; P1's ADK agents and P3's deterministic tools remain separate.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class HealthData(BaseModel):
    ok: bool


class HealthResponse(BaseModel):
    status: str
    source: str
    data: HealthData


class ErrorResponse(BaseModel):
    status: str = "error"
    detail: str


class InventoryItem(BaseModel):
    inventory_id: str
    warehouse_id: str
    product_id: str
    sku: str
    product: Optional[str] = None
    warehouse: Optional[str] = None
    qty: int
    dailyDemand: int
    reserved: int
    reorderPoint: int
    safetyStock: int
    criticality: Optional[str] = None
    incident: Optional[str] = None


class InventoryRisk(BaseModel):
    product_id: str
    total_inventory_units: int
    reserved_units: int
    available_inventory_units: int
    daily_demand_units: int
    safety_stock_units: int
    days_remaining: Optional[float] = None
    below_safety_stock: bool
    risk_level: str


class Shipment(BaseModel):
    shipment_id: str
    product_id: str
    sku: str
    origin: str
    destination: str
    quantity_units: int
    original_eta: str
    current_eta: str
    status: str
    carrier: str
    temperature_status: str


class ShipmentDelay(BaseModel):
    shipment_id: str
    original_eta: str
    current_eta: str
    delay_days: int
    status: str


class ShipmentRisk(BaseModel):
    shipment_id: str
    product_id: str
    quantity_units: int
    delay_days: int
    temperature_status: str
    risk_level: str


class Supplier(BaseModel):
    id: str
    name: str
    location: str
    reliability: float
    risk: str
    capacity: str
    leadTimeDays: int
    priceIndex: str
    status: str
    stockoutProtection: Optional[bool] = None
    cost: float


class Route(BaseModel):
    id: str
    origin: str
    destination: str
    mode: str
    etaDays: int
    cost: float
    risk: str
    capacity: int
    status: str


class FinancePolicy(BaseModel):
    maxSingleOrderUsd: float
    financeApprovalAboveUsd: float


class BudgetCheckRequest(BaseModel):
    agent_id: str = "finance_agent"
    amount_usd: float = Field(ge=0)
    action: str = "EMERGENCY_PROCUREMENT"


class BudgetCheckResponse(BaseModel):
    approved: bool
    agent_id: str
    action: str
    amount_usd: float
    spending_limit_usd: Optional[float] = None
    reason: str


class PurchaseOrder(BaseModel):
    po_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    supplier_id: str
    product_id: str
    quantity: int
    unit_cost_usd: float
    total_cost_usd: float
    warehouse_id: Optional[str] = None
    status: str
    created_at: Optional[str] = None


class PurchaseOrderRequest(BaseModel):
    supplier_id: str
    product_id: str
    quantity: int = Field(gt=0)
    unit_cost_usd: float = Field(ge=0)
    warehouse_id: Optional[str] = None


class GuardrailRequest(BaseModel):
    agent_id: str
    action: str
    request: str


class GuardrailResponse(BaseModel):
    allowed: bool
    agent_id: str
    action: str
    decision: str
    reason: str


class AgentInfo(BaseModel):
    id: str
    name: str
    role: str
    connected: bool


class RecoveryRequest(BaseModel):
    shipment_id: str = Field(min_length=1, max_length=64)
    exclude_supplier_ids: list[str] = Field(default_factory=list, max_length=20)
    exclude_route_ids: list[str] = Field(default_factory=list, max_length=20)


class DashboardResponse(BaseModel):
    incident: dict[str, Any]
    inventory: list[dict[str, Any]]
    suppliers: list[dict[str, Any]]
    routes: list[dict[str, Any]]
    finance: dict[str, Any]
    purchaseOrders: list[dict[str, Any]]
    agents: list[AgentInfo]


class SecurityEvaluateRequest(BaseModel):
    agent_id: str
    action: str
    resource: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
