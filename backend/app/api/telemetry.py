"""Real-time cluster telemetry endpoint."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.core.logging import get_logger

router = APIRouter(prefix="/api/v1", tags=["Telemetry"])
logger = get_logger(__name__)


def _load_k8s_clients():
    from kubernetes import client, config

    try:
        config.load_incluster_config()
    except Exception:
        config.load_kube_config()

    return client.CoreV1Api(), client.AppsV1Api(), client.CustomObjectsApi()


def _host_utilization() -> tuple[float, float]:
    """Fallback host-level metrics when metrics-server is unavailable."""
    try:
        import psutil

        return float(psutil.cpu_percent(interval=0.2)), float(psutil.virtual_memory().percent)
    except Exception:
        return 0.0, 0.0


def _cluster_utilization(custom_api: Any, nodes: list[Any]) -> tuple[float, float] | None:
    """Return cluster CPU and memory utilization using metrics-server and node allocatable capacity."""
    if not nodes:
        return None

    try:
        node_metrics = custom_api.list_cluster_custom_object("metrics.k8s.io", "v1beta1", "nodes")
        items = node_metrics.get("items", [])
        if not items:
            return None

        allocatable_by_node: dict[str, tuple[float, float]] = {}
        for node in nodes:
            node_name = getattr(node.metadata, "name", None)
            alloc = getattr(node.status, "allocatable", None) or {}
            if not node_name:
                continue
            allocatable_by_node[node_name] = (
                _cpu_to_cores(str(alloc.get("cpu", "0"))),
                _memory_to_bytes(str(alloc.get("memory", "0"))),
            )

        total_cpu_used = 0.0
        total_memory_used = 0.0
        total_cpu_capacity = 0.0
        total_memory_capacity = 0.0
        for item in items:
            node_name = item.get("metadata", {}).get("name")
            if not node_name or node_name not in allocatable_by_node:
                continue
            usage = item.get("usage", {})
            cpu_raw = str(usage.get("cpu", "0"))
            mem_raw = str(usage.get("memory", "0"))
            cpu_used = _cpu_to_cores(cpu_raw)
            memory_used = _memory_to_bytes(mem_raw)
            cpu_capacity, memory_capacity = allocatable_by_node[node_name]
            total_cpu_used += cpu_used
            total_memory_used += memory_used
            total_cpu_capacity += cpu_capacity
            total_memory_capacity += memory_capacity

        if total_cpu_capacity <= 0 or total_memory_capacity <= 0:
            return None

        cpu_percent = (total_cpu_used / total_cpu_capacity) * 100.0
        memory_percent = (total_memory_used / total_memory_capacity) * 100.0
        return round(cpu_percent, 1), round(memory_percent, 1)
    except Exception:
        return None


def _cpu_to_cores(value: str) -> float:
    if value.endswith("n"):
        return int(value[:-1]) / 1_000_000_000
    if value.endswith("u"):
        return int(value[:-1]) / 1_000_000
    if value.endswith("m"):
        return int(value[:-1]) / 1_000
    return float(value)


def _memory_to_bytes(value: str) -> float:
    units = {
        "Ki": 1024,
        "Mi": 1024**2,
        "Gi": 1024**3,
        "Ti": 1024**4,
        "K": 1000,
        "M": 1000**2,
        "G": 1000**3,
        "T": 1000**4,
    }
    for suffix, multiplier in units.items():
        if value.endswith(suffix):
            return float(value[: -len(suffix)]) * multiplier
    return float(value)


@router.get("/telemetry")
def get_telemetry() -> dict[str, Any]:
    """Return live pod counts and best-available resource utilisation."""
    try:
        v1, apps_v1, custom_api = _load_k8s_clients()

        pods = v1.list_pod_for_all_namespaces()
        deployments = apps_v1.list_deployment_for_all_namespaces()
        namespaces = v1.list_namespace()
        nodes = v1.list_node()

        running = sum(1 for p in pods.items if p.status.phase == "Running")
        healthy = sum(
            1
            for p in pods.items
            if p.status.container_statuses and all(cs.ready for cs in p.status.container_statuses)
        )
        failed = sum(1 for p in pods.items if p.status.phase in ("Failed", "Unknown"))
        node_count = len(nodes.items)
        ready_nodes = sum(
            1
            for n in nodes.items
            if any(c.type == "Ready" and c.status == "True" for c in (n.status.conditions or []))
        )

        utilization = _cluster_utilization(custom_api, nodes.items)
        source = "real"
        if utilization is None:
            utilization = _host_utilization()
            source = "host"
        cpu_percent, memory_percent = utilization

        logger.info(
            "telemetry_fetched",
            extra={
                "pods": running,
                "nodes": node_count,
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "source": source,
            },
        )
        return {
            "running_pods": running,
            "healthy_pods": healthy,
            "failed_pods": failed,
            "total_pods": len(pods.items),
            "deployments": len(deployments.items),
            "namespaces": len(namespaces.items),
            "nodes": node_count,
            "ready_nodes": ready_nodes,
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "source": source,
        }
    except Exception as exc:
        cpu_percent, memory_percent = _host_utilization()
        logger.warning(
            "telemetry_fetch_failed",
            extra={"error": str(exc), "cpu_percent": cpu_percent, "memory_percent": memory_percent},
        )
        return {
            "running_pods": 0,
            "healthy_pods": 0,
            "failed_pods": 0,
            "total_pods": 0,
            "deployments": 0,
            "namespaces": 0,
            "nodes": 0,
            "ready_nodes": 0,
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "source": "host" if cpu_percent or memory_percent else "unavailable",
            "error": str(exc),
        }
