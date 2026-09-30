# SupplyShield — P2 Frontend ↔ Backend Mapping

## Ownership

- **P1:** Google ADK agents. P1 can add/replace agent implementations without changing the P2 HTTP contract.
- **P2:** This `backend/` API and integration layer.
- **P3:** Deterministic tools under `tools/`, plus security/simulation/observability.
- **P4:** React/Vite frontend under `frontend/`.

P2 does **not** invent agent results. `/api/agents` reports which agent files actually exist.

## Current real-data source

The backend uses the CSV/JSON files already in `data/` through P3's tools. The frontend's original demo constants are not treated as authoritative.

## Endpoint contract

| Frontend need | Endpoint | Source |
|---|---|---|
| Dashboard snapshot | `GET /api/dashboard` | inventory, shipments, suppliers, routes, policies, purchase orders |
| Agent availability | `GET /api/agents` | actual `agents/*/agent.py` files |
| Inventory list | `GET /api/inventory` | `tools.inventory_tools` + product/warehouse lookup |
| Inventory by product | `GET /api/inventory/{product_id}` | `get_inventory` |
| Stockout risk | `GET /api/inventory/{product_id}/risk` | `check_stockout_risk` |
| Delayed shipments | `GET /api/shipments/delayed` | `get_delayed_shipments` |
| Shipment detail | `GET /api/shipments/{shipment_id}` | `get_shipment` |
| Shipment delay | `GET /api/shipments/{shipment_id}/delay` | `calculate_delay` |
| Shipment risk | `GET /api/shipments/{shipment_id}/risk` | `get_shipment_risk` |
| Suppliers for product | `GET /api/suppliers/product/{product_id}` | `get_suppliers_for_product` |
| Supplier detail | `GET /api/suppliers/{supplier_id}` | `get_supplier` |
| Supplier options | `GET /api/suppliers/options/{product_id}?required_quantity=...` | `find_supplier_options` |
| Available routes | `GET /api/routes/available?destination=...` | `get_available_routes` |
| Best routes | `GET /api/routes/best?destination=...` | `find_best_routes` |
| Route detail | `GET /api/routes/{route_id}` | `evaluate_route` |
| Finance policy | `GET /api/finance/policy` | `data/policies.json` |
| Finance policy check | `POST /api/finance/check` | policy thresholds in `policies.json` |
| Existing POs | `GET /api/purchase-orders` | `get_purchase_orders` |
| PO detail | `GET /api/purchase-orders/{po_id}` | `get_purchase_order` |
| PO proposal | `POST /api/purchase-orders/proposals` | `create_purchase_order` |
| PO status proposal | `POST /api/purchase-orders/{po_id}/status?status=...` | `update_purchase_order_status` |
| Shipment update proposal | `POST /api/shipments/{shipment_id}/update?...` | `update_shipment` |
| Security check | `POST /api/security/evaluate` | `evaluate_request` |

## Frontend field mapping

### Inventory

P4 fields:
`sku`, `product`, `warehouse`, `qty`, `dailyDemand`, `safetyStock`, `criticality`, `incident`

P2 returns those plus real IDs:
`inventory_id`, `warehouse_id`, `product_id`, `reserved`, `reorderPoint`.

- `product` ← `products.csv.product_name`
- `warehouse` ← `warehouses.csv.warehouse_name`
- `qty` ← `quantity_units`
- `dailyDemand` ← `daily_demand_units`
- `safetyStock` ← `safety_stock_units`
- `criticality` ← `products.csv.criticality`
- `incident` ← delayed `shipment_id` for the same product, when one exists
- `incident` is therefore a derived relationship, not a separate incident table.

### Suppliers

P4 fields:
`id`, `name`, `location`, `reliability`, `risk`, `capacity`, `leadTimeDays`, `priceIndex`, `status`, `stockoutProtection`, `cost`

P2 uses real supplier IDs (`SUP001`, etc.).

- `id` ← `supplier_id`
- `name` ← `supplier_name`
- `location` ← `country`
- `reliability` ← `reliability_score × 100`
- `risk` ← derived from `risk_score`
- `capacity` ← derived label from `capacity_units`
- `leadTimeDays` ← `lead_time_days`
- `priceIndex` ← derived relative price band
- `cost` ← `unit_price_usd`
- `stockoutProtection` ← `null` because the source data has no such field

### Routes

P4 fields:
`id`, `origin`, `destination`, `mode`, `etaDays`, `cost`, `risk`, `capacity`, `status`

Mappings:
- `id` ← `route_id`
- `etaDays` ← `transit_days`
- `cost` ← `cost_usd`
- `risk` ← derived from `risk_score`
- `capacity` ← `capacity_units`

### Finance

The original frontend demo uses `$250,000 emergencyBudget`, `$0 committedSpend`, and `$150,000 policyThreshold`. Those are **demo values** and do not exist in the backend source data.

P2 therefore does not pretend they are real:
- `policyThreshold` ← `requires_finance_approval_above_usd` (currently $50,000)
- `maxSingleOrderUsd` ← `max_single_order_usd` (currently $100,000)
- `emergencyBudget` ← `null`
- `committedSpend` ← `null`

### Purchase orders

The real CSV uses `po_id`, `supplier_id`, `product_id`, `quantity_units`, `unit_price_usd`, etc. The API preserves those real identifiers. P4 should map them to its display fields when wiring the UI.

## Important integration rule

Do not copy the old P4 `*_INIT` data into the backend. When P4 is wired, replace local demo state with API responses from these endpoints. Keep the frontend-only presentation fields where useful, but use the real backend IDs and values.

## Agent integration

Only `inventory_agent` and `shipment_agent` are present in the supplied P1 project at this point. P2 should not create fake supplier/risk/finance/logistics/procurement agent responses. When P1 adds an agent, it can be connected behind the same API layer.
