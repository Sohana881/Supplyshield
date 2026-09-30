# SupplyShield — Real Multi-Agent SupplyChain Recovery 

SupplyShield is an enterprise supply-chain disruption control center built around:

- **Google ADK multi-agent orchestration**
- **Deterministic supply-chain tools** backed by CSV/JSON source data
- **FastAPI** integration/API layer
- **React + Vite** control-room frontend
- Security guardrails, audit events, simulation and observability

## Architecture

```text
React Dashboard
      |
      | POST /api/recovery
      v
FastAPI Backend
      |
      +--> deterministic tools/data (source of truth)
      |
      +--> Inventory Agent   \ 
      +--> Shipment Agent     |
      +--> Supplier Agent     |--> verified findings
      +--> Logistics Agent   /
      +--> Finance Agent
      +--> Risk Agent
      +--> Procurement Agent
      |
      +--> Command Agent --> final synthesis
      v
Structured recovery result --> React dashboard
```

The frontend **does not simulate the autonomous recovery workflow**. The recovery button calls the backend, which executes the ADK agents and deterministic tools. Policy checks are enforced in Python before an action can be treated as executable.

## Important: real data and policy are authoritative

The supplied data makes `SHP001` a genuinely difficult incident: it has a 6-day delay and about 3.31 days of available inventory runway. Recovery now checks two paths in order: (1) expedite enough of the existing delayed shipment to bridge the runway, when an origin-compatible route has sufficient capacity and is policy-compliant, then (2) fall back to emergency procurement. This prevents the workflow from incorrectly rejecting a viable expedited shipment just because the full delayed shipment quantity is larger than one route's capacity. If neither path is policy-compliant, the system still returns **NO_FEASIBLE_PLAN** rather than fabricating success.

That behavior is intentional: the system never fabricates a successful recovery just to make the dashboard look good.

## Local Windows setup

### 1. Create a virtual environment

```powershell
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install Python dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure Gemini

Copy `.env.example` to `.env` and put your Google AI Studio key in:

```env
GOOGLE_API_KEY=your_key_here
```

Do not commit `.env`.

### 4. Start the backend

From the repository root:

```powershell
uvicorn backend.main:app --reload
```

Verify:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

### 5. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### 6. Verify the real recovery path

Click **RUN AUTONOMOUS RECOVERY**.

The backend terminal should receive:

```text
POST /api/recovery
```

The browser should update from the JSON returned by the backend. The recovery timeline is populated from the actual tool/agent workflow; it is not the old hardcoded frontend sequence.

## API endpoints

- `GET /health`
- `GET /api/dashboard`
- `GET /api/agents`
- `GET /api/inventory`
- `GET /api/inventory/{product_id}/risk`
- `GET /api/shipments/delayed`
- `GET /api/shipments/{shipment_id}`
- `GET /api/shipments/{shipment_id}/risk`
- `GET /api/suppliers/product/{product_id}`
- `GET /api/suppliers/options/{product_id}`
- `GET /api/routes/best`
- `GET /api/finance/policy`
- `POST /api/finance/check`
- `POST /api/recovery`
- `GET /api/purchase-orders`
- `POST /api/purchase-orders/proposals`
- `POST /api/security/evaluate`

Example recovery request:

```json
{
  "shipment_id": "SHP001"
}
```

A replan can exclude a disrupted supplier/route:

```json
{
  "shipment_id": "SHP001",
  "exclude_supplier_ids": ["SUP002"]
}
```

## Tests

For development/CI, install the test dependencies:

```powershell
pip install -r requirements-dev.txt
pytest -q
```

The test suite covers the deterministic tools, guardrails, backend health/data contracts, agent presence, and the recovery orchestration using mocked ADK calls for deterministic CI testing.

## Docker deployment

Set `GOOGLE_API_KEY` in the shell/environment, then:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:5173
```

The frontend Nginx container proxies `/api/*` to the FastAPI container, so the browser does not need a separate backend URL in production.

## Production notes

- Store `GOOGLE_API_KEY` in the deployment platform's secret manager.
- Set `SUPPLYSHIELD_CORS_ORIGINS` to the exact browser origins when FastAPI is exposed directly.
- Put TLS/authentication/rate limiting in front of the API for public deployment.
- The current procurement/shipment tools intentionally return proposals rather than silently mutating external ERP systems. Connect those tools to a real ERP/PO service only after approval and authorization requirements are defined.


## Security / Policy Governance

Sensitive tool calls are enforced by the deterministic `security.engine` **before** execution. Agent permissions and governance rules are centralized in `data/policies.json`; external supplier messages are treated as untrusted data and cannot grant permissions.

Security audit events are stored using the `incidents/{incidentId}/audit/{auditId}` shape when `FIRESTORE_ENABLED=true` and Google Cloud Firestore credentials are configured. Local development falls back to `security/audit_log.jsonl` with the same event fields, so the UI and tests remain deterministic.

Security endpoints:
- `GET /api/security/events`
- `GET /api/security/policies`
- `POST /api/security/evaluate`
- `POST /api/security/demo/supplier-export`

The Security Center's **Run Malicious Supplier Demo** sends an untrusted supplier instruction through the real pre-execution guard. The export executor is not called when the request is blocked.
