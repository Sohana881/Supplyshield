# SupplyShield Integration Notes

This file is retained for project history. The current implementation is documented in `README.md`.

The P2 integration has now been completed through the real recovery path:

```text
React -> FastAPI /api/recovery -> Google ADK agents + deterministic tools -> structured result -> React
```

The old frontend-only autonomous recovery sequencer has been removed from the active workflow.
