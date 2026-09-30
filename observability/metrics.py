METRICS = {
    "agent_calls": 0,
    "tool_calls": 0,
    "successful_actions": 0,
    "failed_actions": 0,
    "blocked_actions": 0
}


def increment(metric_name: str, amount: int = 1):
    """Increment a metric."""

    if metric_name not in METRICS:
        METRICS[metric_name] = 0

    METRICS[metric_name] += int(amount)

    return METRICS[metric_name]


def get_metrics():
    """Return current metrics."""

    return {
        key: int(value)
        for key, value in METRICS.items()
    }


def reset_metrics():
    """Reset all metrics."""

    for key in METRICS:
        METRICS[key] = 0

    return get_metrics()