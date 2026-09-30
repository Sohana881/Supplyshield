import time
import uuid


def start_trace(
    operation: str,
    agent_id: str | None = None
):
    """Start a simple trace."""

    return {
        "trace_id": str(uuid.uuid4()),
        "operation": str(operation),
        "agent_id": agent_id,
        "start_time": time.time()
    }


def end_trace(trace: dict, status: str = "SUCCESS"):
    """Finish a trace and calculate duration."""

    end_time = time.time()

    trace["end_time"] = end_time
    trace["duration_seconds"] = round(
        end_time - trace["start_time"],
        4
    )
    trace["status"] = str(status)

    return trace