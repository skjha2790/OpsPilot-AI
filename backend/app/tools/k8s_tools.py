"""Real Kubernetes tool implementations using the kubernetes Python client.

Each tool maps directly to one kubectl operation. The agent loop decides
which tools to call and in what order based on the evidence it collects.
"""

from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.tools.base import BaseTool

logger = get_logger(__name__)


def _load_k8s_config() -> None:
    from kubernetes import config

    if getattr(_load_k8s_config, "_loaded", False):
        return

    try:
        config.load_incluster_config()
        logger.info("k8s_config_loaded", extra={"source": "in_cluster"})
    except Exception:
        config.load_kube_config()
        logger.info("k8s_config_loaded", extra={"source": "kubeconfig"})
    _load_k8s_config._loaded = True


def _core_v1():
    from kubernetes import client

    _load_k8s_config()
    return client.CoreV1Api()


def _apps_v1():
    from kubernetes import client

    _load_k8s_config()
    return client.AppsV1Api()


def _to_yaml_like(value: Any, indent: int = 0) -> str:
    pad = " " * indent
    if isinstance(value, dict):
        lines: list[str] = []
        for key, item in value.items():
            if isinstance(item, (dict, list)):
                lines.append(f"{pad}{key}:")
                lines.append(_to_yaml_like(item, indent + 2))
            else:
                lines.append(f"{pad}{key}: {item!s}")
        return "\n".join(lines)
    if isinstance(value, list):
        lines = []
        for item in value:
            if isinstance(item, (dict, list)):
                lines.append(f"{pad}-")
                lines.append(_to_yaml_like(item, indent + 2))
            else:
                lines.append(f"{pad}- {item!s}")
        return "\n".join(lines)
    return f"{pad}{value!s}"


def _event_sort_key(event: Any):
    return (
        getattr(event, "event_time", None)
        or getattr(event, "last_timestamp", None)
        or getattr(event, "first_timestamp", None)
        or getattr(getattr(event, "metadata", None), "creation_timestamp", None)
        or ""
    )


class PodTool(BaseTool):
    """Kubernetes pod operations: list, describe, and fetch logs."""

    name = "kubernetes.pod"
    description = "List pods, describe a specific pod, or fetch pod logs from the cluster."

    def execute(self, operation: str, **kwargs: Any) -> Any:
        if operation == "get_pods":
            return self._get_pods(kwargs.get("namespace", "default"))
        if operation == "get_logs":
            return self._get_logs(
                kwargs["name"],
                kwargs.get("namespace", "default"),
                kwargs.get("previous", False),
            )
        if operation == "describe_pod":
            return self._describe_pod(kwargs["name"], kwargs.get("namespace", "default"))
        return {"error": f"Unknown operation: {operation}"}

    def _get_pods(self, namespace: str) -> dict[str, Any]:
        try:
            v1 = _core_v1()
            pods = v1.list_namespaced_pod(namespace=namespace)
            result = []
            for p in pods.items:
                container_statuses = p.status.container_statuses or []
                waiting_reason = None
                restart_count = 0
                ready = False
                if container_statuses:
                    cs = container_statuses[0]
                    restart_count = cs.restart_count
                    ready = cs.ready
                    if cs.state and cs.state.waiting:
                        waiting_reason = cs.state.waiting.reason
                result.append(
                    {
                        "name": p.metadata.name,
                        "namespace": p.metadata.namespace,
                        "phase": p.status.phase,
                        "reason": waiting_reason,
                        "restarts": restart_count,
                        "ready": ready,
                        "node": p.spec.node_name,
                    }
                )
            logger.info("tool_get_pods", extra={"ns": namespace, "cnt": len(result)})
            return {"pods": result, "namespace": namespace}
        except Exception as exc:
            logger.exception("tool_get_pods_failed", extra={"ns": namespace})
            return {"error": str(exc), "namespace": namespace}

    def _get_logs(self, name: str, namespace: str, previous: bool) -> dict[str, Any]:
        from kubernetes.client.rest import ApiException

        try:
            v1 = _core_v1()
            logs = v1.read_namespaced_pod_log(
                name=name,
                namespace=namespace,
                tail_lines=80,
                previous=previous,
            )
            logger.info("tool_get_logs", extra={"pod_name": name, "namespace": namespace, "previous": previous})
            return {
                "pod_name": name,
                "namespace": namespace,
                "previous_requested": previous,
                "previous_used": previous,
                "logs": logs,
            }
        except ApiException as exc:
            if previous and exc.status == 400:
                logger.info(
                    "tool_get_logs_previous_fallback",
                    extra={"pod_name": name, "namespace": namespace},
                )
                try:
                    v1 = _core_v1()
                    logs = v1.read_namespaced_pod_log(
                        name=name,
                        namespace=namespace,
                        tail_lines=80,
                        previous=False,
                    )
                    return {
                        "pod_name": name,
                        "namespace": namespace,
                        "previous_requested": True,
                        "previous_used": False,
                        "fallback_reason": "previous_container_unavailable",
                        "logs": logs,
                    }
                except Exception as fallback_exc:
                    logger.exception("tool_get_logs_fallback_failed", extra={"pod_name": name})
                    return {"pod_name": name, "namespace": namespace, "error": str(fallback_exc)}
            logger.exception("tool_get_logs_failed", extra={"pod_name": name})
            return {"pod_name": name, "namespace": namespace, "error": str(exc)}
        except Exception as exc:
            logger.exception("tool_get_logs_failed", extra={"pod_name": name})
            return {"pod_name": name, "namespace": namespace, "error": str(exc)}

    def _describe_pod(self, name: str, namespace: str) -> dict[str, Any]:
        try:
            v1 = _core_v1()
            pod = v1.read_namespaced_pod(name=name, namespace=namespace)
            events_resp = v1.list_namespaced_event(
                namespace=namespace,
                field_selector=f"involvedObject.name={name}",
            )
            conditions = [
                {"type": c.type, "status": c.status, "reason": c.reason, "message": c.message}
                for c in (pod.status.conditions or [])
            ]
            container_states = []
            for cs in pod.status.container_statuses or []:
                state_detail: dict[str, Any] = {}
                if cs.state:
                    if cs.state.running:
                        state_detail = {"state": "running"}
                    elif cs.state.waiting:
                        state_detail = {"state": "waiting", "reason": cs.state.waiting.reason, "message": cs.state.waiting.message}
                    elif cs.state.terminated:
                        state_detail = {
                            "state": "terminated",
                            "reason": cs.state.terminated.reason,
                            "exit_code": cs.state.terminated.exit_code,
                            "message": cs.state.terminated.message,
                        }
                container_states.append(
                    {
                        "name": cs.name,
                        "ready": cs.ready,
                        "restart_count": cs.restart_count,
                        **state_detail,
                    }
                )
            events = [
                {"reason": e.reason, "message": e.message, "type": e.type, "count": e.count}
                for e in sorted(events_resp.items, key=_event_sort_key, reverse=True)[:15]
            ]
            logger.info("tool_describe_pod", extra={"pod_name": name, "namespace": namespace})
            return {
                "name": pod.metadata.name,
                "namespace": pod.metadata.namespace,
                "phase": pod.status.phase,
                "node": pod.spec.node_name,
                "conditions": conditions,
                "container_states": container_states,
                "events": events,
            }
        except Exception as exc:
            logger.exception("tool_describe_pod_failed", extra={"pod_name": name})
            return {"pod_name": name, "error": str(exc)}


class EventTool(BaseTool):
    """Kubernetes events from a namespace."""

    name = "kubernetes.event"
    description = "Fetch recent Kubernetes events from a namespace."

    def execute(self, operation: str, **kwargs: Any) -> Any:
        namespace = kwargs.get("namespace", "default")
        try:
            v1 = _core_v1()
            events_resp = v1.list_namespaced_event(namespace=namespace)
            events = [
                {
                    "reason": e.reason,
                    "message": e.message,
                    "type": e.type,
                    "object": e.involved_object.name,
                    "object_kind": e.involved_object.kind,
                    "count": e.count,
                }
                for e in sorted(events_resp.items, key=_event_sort_key, reverse=True)[:25]
            ]
            logger.info("tool_get_events", extra={"ns": namespace, "count": len(events)})
            return {"events": events, "namespace": namespace}
        except Exception as exc:
            logger.exception("tool_get_events_failed", extra={"ns": namespace})
            return {"error": str(exc), "namespace": namespace}


class DeploymentTool(BaseTool):
    """Kubernetes deployment status."""

    name = "kubernetes.deployment"
    description = "List deployments and their readiness state in a namespace."

    def execute(self, operation: str, **kwargs: Any) -> Any:
        from kubernetes import client

        namespace = kwargs.get("namespace", "default")
        try:
            apps = _apps_v1()
            api_client = client.ApiClient()
            deps = apps.list_namespaced_deployment(namespace=namespace)
            result = []
            for d in deps.items:
                conditions = [
                    {"type": c.type, "status": c.status, "message": c.message}
                    for c in (d.status.conditions or [])
                ]
                manifest = api_client.sanitize_for_serialization(d)
                result.append(
                    {
                        "name": d.metadata.name,
                        "namespace": d.metadata.namespace,
                        "desired": d.spec.replicas,
                        "ready": d.status.ready_replicas or 0,
                        "available": d.status.available_replicas or 0,
                        "image": d.spec.template.spec.containers[0].image if d.spec.template.spec.containers else None,
                        "conditions": conditions,
                        "manifest_yaml": _to_yaml_like(manifest),
                    }
                )
            logger.info("tool_get_deployments", extra={"ns": namespace, "cnt": len(result)})
            return {"deployments": result, "namespace": namespace}
        except Exception as exc:
            logger.exception("tool_get_deployments_failed", extra={"ns": namespace})
            return {"error": str(exc), "namespace": namespace}


class NodeTool(BaseTool):
    """Kubernetes node health."""

    name = "kubernetes.node"
    description = "Get node readiness, conditions, and resource pressure."

    def execute(self, operation: str, **kwargs: Any) -> Any:
        try:
            v1 = _core_v1()
            nodes_resp = v1.list_node()
            result = []
            for n in nodes_resp.items:
                conditions = {c.type: c.status for c in (n.status.conditions or [])}
                result.append(
                    {
                        "name": n.metadata.name,
                        "ready": conditions.get("Ready", "Unknown"),
                        "memory_pressure": conditions.get("MemoryPressure", "Unknown"),
                        "disk_pressure": conditions.get("DiskPressure", "Unknown"),
                        "pid_pressure": conditions.get("PIDPressure", "Unknown"),
                        "conditions": [
                            {"type": c.type, "status": c.status, "reason": c.reason}
                            for c in (n.status.conditions or [])
                        ],
                    }
                )
            logger.info("tool_get_nodes", extra={"cnt": len(result)})
            return {"nodes": result}
        except Exception as exc:
            logger.exception("tool_get_nodes_failed")
            return {"error": str(exc)}
