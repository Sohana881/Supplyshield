# Integration Verification

## Completed

- React recovery button now calls `POST /api/recovery`.
- FastAPI recovery endpoint invokes the real Google ADK agents.
- Inventory, Shipment, Supplier, Logistics, Finance, Risk, Procurement and Command agents are present.
- Deterministic CSV/JSON tools remain the source of truth for business facts and policy.
- Policy gating prevents the agent layer from claiming an action is executable when it exceeds policy or cannot cover the inventory runway.
- Dashboard hydration uses `/api/dashboard` real source data.
- Recovery results update the timeline, agent panel, finance, procurement and decision views.
- Replanning can exclude a supplier and execute a fresh real analysis.
- Added Docker deployment files.
- Added backend/recovery tests.

## Verification performed in this environment

- Python compile check: PASS
- Pytest: 22 passed
- FastAPI health/dashboard/agent contracts: PASS
- Recovery orchestration unit test with mocked ADK calls: PASS

## External-runtime verification still required

This environment does not have network access to install npm packages or `google-adk`, so a real Gemini call and `npm run build` could not be executed here. The project includes the required dependency declarations and exact run instructions; run the final end-to-end check on the deployment machine with `GOOGLE_API_KEY` configured.

The system is deliberately fail-closed: if required ADK agents cannot execute, `/api/recovery` returns an error rather than showing a fabricated successful recovery.


## Security / Policy Governance

- Added centralized deterministic security policy engine in `security/engine.py`.
- Centralized agent permissions and policy thresholds in `data/policies.json`.
- Added pre-execution `secure_tool_call()` wrapper; BLOCK and REQUIRE_APPROVAL never invoke the underlying executor.
- Added durable audit repository with Firestore path `incidents/{incidentId}/audit/{auditId}` when enabled, plus JSONL local fallback.
- Added `/api/security/events`, `/api/security/policies`, `/api/security/evaluate`, and the real pre-execution supplier-export demo endpoint.
- Security Center now hydrates policies, agent permissions, and events from the backend and includes the malicious supplier demo trigger.
- Added automated tests covering emergency procurement, sensitive exports, supplier trust boundary, route authority, unauthorized actions, pre-execution blocking, and audit creation.
