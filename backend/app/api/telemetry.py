"""Real-time cluster telemetry endpoint.

Replaces the random number generator in the frontend usePlatformTelemetry hook
with actual data from the Kubernetes cluster.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.core.logging import get_logger

router = APIRouter(prefix="/api/v1", tags=["Telemetry"])
logger = get_logger(__name__)


@router.get("/telemetry")
def get_telemetry() -> dict:
    """Return live pod counts and basic resource utilisation from the cluster."""
    try:
        from kubernetes import client, config

        try:
            config.load_incluster_config()
        except Exception:
            config.load_kube_config()

        v1 = client.CoreV1Api()
        apps_v1 = client.AppsV1Api()

        pods = v1.list_pod_for_all_namespaces()
        deployments = apps_v1.list_deployment_for_all_namespaces()
        namespaces = v1.list_namespace()
        nodes = v1.list_node()

        running = sum(1 for p in pods.items if p.status.phase == "Running")
        ready = sum(
            1
            for p in pods.items
            if p.status.container_statuses
            and all(cs.ready for cs in p.status.container_statuses)
        )
        failed = sum(
            1
            for p in pods.items
            if p.status.phase in ("Failed", "Unknown")
        )

        node_count = len(nodes.items)
        ready_nodes = sum(
            1
            for n in nodes.items
            if any(
                c.type == "Ready" and c.status == "True"
                for c in (n.status.conditions or [])
            )
        )

        logger.info("telemetry_fetched", extra={"pods": running, "nodes": node_count})

        return {
            "running_pods": running,
            "healthy_pods": ready,
            "failed_pods": failed,
            "total_pods": len(pods.items),
            "deployments": len(deployments.items),
            "namespaces": len(namespaces.items),
            "nodes": node_count,
            "ready_nodes": ready_nodes,
            "source": "real",
        }
    except Exception as exc:
        logger.warning("telemetry_fetch_failed", extra={"error": str(exc)})
        return {
            "running_pods": 0,
            "healthy_pods": 0,
            "failed_pods": 0,
            "total_pods": 0,
            "deployments": 0,
            "namespaces": 0,
            "nodes": 0,
            "ready_nodes": 0,
            "source": "unavailable",
            "error": str(exc),
        }
try:
    from kubernetes.client import CustomObjectsApi
    custom = CustomObjectsApi()
    node_metrics = custom.list_cluster_custom_object(
        "metrics.k8s.io", "v1beta1", "nodes"
    )
    total_cpu = sum(
        int(n["usage"]["cpu"].rstrip("n"))
        for n in node_metrics["items"]
    ) / 1e9  # convert nanocores to cores
    return_dict["cpu_percent"] = round(total_cpu * 100 / 2, 1)  # 2 cores Kind default
except Exception:
    pass  # metrics-server not available

