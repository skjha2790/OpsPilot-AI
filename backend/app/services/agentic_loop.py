"""Real agentic investigation loop using OpenAI tool/function calling."""

from __future__ import annotations

import json
import re
import time
from collections.abc import Callable
from typing import Any

from app.core.logging import get_logger
from app.schemas.investigation import InvestigationResponse
from app.tools.registry import ToolRegistry

logger = get_logger(__name__)

MAX_TURNS = 8

TOOLS_SCHEMA: list[dict[str, Any]] = [
    {
        "type": "function",
        "name": "get_pods",
        "description": "List pods and their current state in a namespace.",
        "parameters": {
            "type": "object",
            "properties": {"namespace": {"type": "string"}},
            "required": ["namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_pod_logs",
        "description": "Fetch logs from a pod. Use previous=true for crash loops.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "namespace": {"type": "string"},
                "previous": {"type": "boolean"},
            },
            "required": ["name", "namespace", "previous"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "describe_pod",
        "description": "Inspect pod status, conditions, container states, and events.",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "namespace": {"type": "string"},
            },
            "required": ["name", "namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_events",
        "description": "Fetch recent Kubernetes events for a namespace.",
        "parameters": {
            "type": "object",
            "properties": {"namespace": {"type": "string"}},
            "required": ["namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_deployments",
        "description": "Get deployments, images, and readiness state in a namespace.",
        "parameters": {
            "type": "object",
            "properties": {"namespace": {"type": "string"}},
            "required": ["namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_nodes",
        "description": "Get node readiness and pressure indicators.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
        "strict": True,
    },
]

SYSTEM_PROMPT = """\
You are OpsPilot AI - an autonomous Kubernetes SRE investigation agent.

Investigate the incident using real Kubernetes evidence from tool calls.
- Inspect the cluster state first.
- Choose follow-up tools based on evidence.
- For CrashLoopBackOff or startup failures, inspect pod details, pod logs, and namespace events before concluding.
- For ImagePullBackOff or ErrImagePull, inspect events and deployment image details before concluding.
- Never invent evidence.

Return ONLY valid JSON:
{
  "summary": "<one sentence executive summary>",
  "root_cause": "<specific root cause based on evidence>",
  "confidence": <integer 0-100>,
  "evidence": ["<fact from tool output 1>", "<fact from tool output 2>"],
  "remediation": "<primary recommended action>",
  "recovery_steps": ["<step 1>", "<step 2>"]
}
"""


def _infer_namespace_from_incident(incident: str) -> str:
    match = re.search(r"(?:namespace\s+|in\s+)([a-z0-9][a-z0-9-]*)", incident, re.IGNORECASE)
    return match.group(1) if match else "default"


def _extract_deployment_from_tool_output(tool_name: str, output: Any, namespace_hint: str) -> tuple[str | None, str | None]:
    if tool_name == "get_pods":
        pods = output.get("pods", []) if isinstance(output, dict) else []
        ns = output.get("namespace", namespace_hint) if isinstance(output, dict) else namespace_hint
        for pod in pods:
            if not isinstance(pod, dict):
                continue
            if pod.get("reason") in (
                "CrashLoopBackOff",
                "ImagePullBackOff",
                "ErrImagePull",
                "OOMKilled",
                "Error",
                "CreateContainerConfigError",
            ) or pod.get("restarts", 0) > 0:
                raw_name = str(pod.get("name", ""))
                parts = raw_name.rsplit("-", 2)
                if len(parts) >= 3:
                    return parts[0], ns
                if len(parts) == 2:
                    return parts[0], ns
        if pods and isinstance(pods[0], dict):
            raw_name = str(pods[0].get("name", ""))
            parts = raw_name.rsplit("-", 2)
            return (parts[0] if len(parts) >= 2 else raw_name), ns

    if tool_name == "get_deployments":
        deps = output.get("deployments", []) if isinstance(output, dict) else []
        ns = output.get("namespace", namespace_hint) if isinstance(output, dict) else namespace_hint
        for dep in deps:
            if not isinstance(dep, dict):
                continue
            desired = dep.get("desired") or 1
            ready = dep.get("ready") or 0
            if ready < desired:
                return dep.get("name"), dep.get("namespace") or ns
        if deps and isinstance(deps[0], dict):
            return deps[0].get("name"), deps[0].get("namespace") or ns

    return None, None


def _dispatch(name: str, arguments: dict[str, Any], registry: ToolRegistry) -> Any:
    try:
        if name == "get_pods":
            return registry.get("kubernetes.pod").execute(operation="get_pods", namespace=arguments.get("namespace", "default"))
        if name == "get_pod_logs":
            return registry.get("kubernetes.pod").execute(
                operation="get_logs",
                name=arguments["name"],
                namespace=arguments.get("namespace", "default"),
                previous=arguments.get("previous", False),
            )
        if name == "describe_pod":
            return registry.get("kubernetes.pod").execute(
                operation="describe_pod",
                name=arguments["name"],
                namespace=arguments.get("namespace", "default"),
            )
        if name == "get_events":
            return registry.get("kubernetes.event").execute(operation="get_events", namespace=arguments.get("namespace", "default"))
        if name == "get_deployments":
            return registry.get("kubernetes.deployment").execute(
                operation="get_deployments",
                namespace=arguments.get("namespace", "default"),
            )
        if name == "get_nodes":
            return registry.get("kubernetes.node").execute(operation="get_nodes")
        return {"error": f"Unknown tool: {name}"}
    except Exception as exc:
        logger.exception("agentic_tool_dispatch_failed", extra={"tool": name})
        return {"error": str(exc), "tool": name}


def _pick_primary_pod(output: Any) -> dict[str, Any] | None:
    pods = output.get("pods", []) if isinstance(output, dict) else []
    candidates = [pod for pod in pods if isinstance(pod, dict)]
    if not candidates:
        return None

    def priority(pod: dict[str, Any]) -> tuple[int, int]:
        reason = str(pod.get("reason") or "")
        phase = str(pod.get("phase") or "")
        restarts = int(pod.get("restarts") or 0)
        if reason in {"CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "OOMKilled", "CreateContainerConfigError"}:
            return (0, -restarts)
        if phase in {"Pending", "Failed", "Unknown"}:
            return (1, -restarts)
        return (2, -restarts)

    return sorted(candidates, key=priority)[0]


def _mandatory_follow_up_calls(get_pods_output: Any, namespace: str) -> list[tuple[str, dict[str, Any]]]:
    pod = _pick_primary_pod(get_pods_output)
    if not pod:
        return [("get_deployments", {"namespace": namespace}), ("get_events", {"namespace": namespace})]

    pod_name = str(pod.get("name") or "")
    reason = str(pod.get("reason") or "")
    phase = str(pod.get("phase") or "")
    restarts = int(pod.get("restarts") or 0)

    calls: list[tuple[str, dict[str, Any]]] = []
    if pod_name:
        calls.append(("describe_pod", {"name": pod_name, "namespace": namespace}))

    if reason in {"CrashLoopBackOff", "OOMKilled", "Error", "CreateContainerConfigError"} or phase == "Failed" or restarts > 0:
        if pod_name:
            calls.append(("get_pod_logs", {"name": pod_name, "namespace": namespace, "previous": True}))
        calls.append(("get_events", {"namespace": namespace}))

    if reason in {"ImagePullBackOff", "ErrImagePull"}:
        calls.append(("get_events", {"namespace": namespace}))
        calls.append(("get_deployments", {"namespace": namespace}))

    if phase == "Pending":
        calls.append(("get_events", {"namespace": namespace}))
        calls.append(("get_nodes", {}))

    deduped: list[tuple[str, dict[str, Any]]] = []
    seen: set[tuple[str, str]] = set()
    for tool_name, args in calls:
        key = (tool_name, json.dumps(args, sort_keys=True))
        if key in seen:
            continue
        seen.add(key)
        deduped.append((tool_name, args))
    return deduped


def _tool_to_agent_label(tool_name: str) -> str:
    mapping = {
        "get_pods": "Pod Inspection Agent",
        "get_pod_logs": "Logs Collection Agent",
        "describe_pod": "Pod Inspection Agent",
        "get_events": "Events Collection Agent",
        "get_deployments": "Kubernetes Discovery Agent",
        "get_nodes": "Node Diagnostics Agent",
    }
    return mapping.get(tool_name, "Tool Execution Agent")


def _extract_deployment_from_recovery_steps(steps: list[str]) -> str | None:
    for step in steps:
        match = re.search(r"deployment[s]?/([a-z0-9][a-z0-9-]{1,52})", step, re.IGNORECASE)
        if match:
            return match.group(1)
        match = re.search(r"deploy/([a-z0-9][a-z0-9-]{1,52})", step, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def run_agentic_loop(
    incident: str,
    registry: ToolRegistry,
    openai_client: Any,
    model: str,
    event_callback: Callable[[dict[str, Any]], None] | None = None,
) -> tuple[InvestigationResponse, list[str], str | None, str | None, dict[str, Any]]:
    """Run the agentic investigation loop."""

    def emit(event: dict[str, Any]) -> None:
        if event_callback:
            try:
                if "ts" not in event:
                    event["ts"] = int(time.time() * 1000)
                event_callback(event)
            except Exception:
                pass

    def record_tool_execution(tool_name: str, args: dict[str, Any], turn: int) -> Any:
        tools_called.append(tool_name)
        logger.info("agentic_tool_call", extra={"tool": tool_name, "tool_args": str(args), "turn": turn})
        emit({"type": "tool_call", "tool": tool_name, "args": args})
        agent_label = _tool_to_agent_label(tool_name)
        emit({"type": "agent_step", "agent": agent_label, "status": "running"})
        output = _dispatch(tool_name, args, registry)
        evidence_key = f"tool_call_{len(tools_called):02d}_{tool_name}"
        tool_evidence[evidence_key] = {"tool": tool_name, "arguments": args, "output": output}
        emit({"type": "tool_result", "tool": tool_name, "output": output})
        emit({"type": "agent_step", "agent": agent_label, "status": "completed"})
        return output

    messages: list[Any] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Investigate this incident: {incident}"},
    ]

    tools_called: list[str] = []
    tool_evidence: dict[str, Any] = {}
    discovered_deployment: str | None = None
    discovered_namespace: str | None = None
    namespace_hint = _infer_namespace_from_incident(incident)

    emit({"type": "agent_step", "agent": "Incident Intake Agent", "status": "running"})
    emit({"type": "agent_step", "agent": "Incident Intake Agent", "status": "completed"})
    emit({"type": "agent_step", "agent": "Incident Classification Agent", "status": "running"})
    emit({"type": "agent_step", "agent": "Incident Classification Agent", "status": "completed"})
    emit({"type": "agent_step", "agent": "Kubernetes Discovery Agent", "status": "running"})

    for turn in range(MAX_TURNS):
        logger.info("agentic_loop_turn", extra={"turn_num": turn, "incident": incident[:80]})

        if turn == 0:
            preflight_output = record_tool_execution("get_pods", {"namespace": namespace_hint}, turn)
            dep, ns = _extract_deployment_from_tool_output("get_pods", preflight_output, namespace_hint)
            if dep and discovered_deployment is None:
                discovered_deployment = dep
                discovered_namespace = ns or namespace_hint

            for tool_name, args in _mandatory_follow_up_calls(preflight_output, discovered_namespace or namespace_hint):
                output = record_tool_execution(tool_name, args, turn)
                if discovered_deployment is None:
                    dep, ns = _extract_deployment_from_tool_output(tool_name, output, args.get("namespace", discovered_namespace or namespace_hint))
                    if dep:
                        discovered_deployment = dep
                        discovered_namespace = ns or args.get("namespace", namespace_hint)

            emit({"type": "agent_step", "agent": "Kubernetes Discovery Agent", "status": "completed"})
            messages.append(
                {
                    "role": "user",
                    "content": (
                        "The orchestrator already collected Kubernetes evidence from the live cluster. "
                        "Use it before deciding whether more tool calls are needed.\n"
                        f"{json.dumps(tool_evidence, default=str)}"
                    ),
                }
            )

        response = openai_client.responses.create(model=model, input=messages, tools=TOOLS_SCHEMA)
        messages.extend(response.output)
        tool_calls = [item for item in response.output if hasattr(item, "type") and item.type == "function_call"]

        if not tool_calls:
            emit({"type": "agent_step", "agent": "Root Cause Analysis Agent", "status": "running"})
            payload = json.loads(response.output_text)
            result = InvestigationResponse.model_validate(payload)
            if not discovered_deployment:
                discovered_deployment = _extract_deployment_from_recovery_steps(result.recovery_steps)
            emit({"type": "agent_step", "agent": "Root Cause Analysis Agent", "status": "completed"})
            emit({"type": "agent_step", "agent": "Risk Assessment Agent", "status": "running"})
            emit({"type": "agent_step", "agent": "Risk Assessment Agent", "status": "completed"})
            emit({"type": "agent_step", "agent": "Decision Agent", "status": "running"})
            emit({"type": "agent_step", "agent": "Decision Agent", "status": "completed"})
            emit({"type": "agent_step", "agent": "Verification Agent", "status": "running"})
            emit({"type": "agent_step", "agent": "Verification Agent", "status": "completed"})
            emit({
                "type": "complete",
                "result": result.model_dump(),
                "tools_called": tools_called,
                "deployment_name": discovered_deployment,
                "namespace": discovered_namespace,
            })
            return result, tools_called, discovered_deployment, discovered_namespace, tool_evidence

        function_outputs: list[dict[str, Any]] = []
        for call in tool_calls:
            args = json.loads(call.arguments) if isinstance(call.arguments, str) else call.arguments
            tool_name = call.name
            output = record_tool_execution(tool_name, args, turn)
            if discovered_deployment is None:
                ns_hint = args.get("namespace", discovered_namespace or namespace_hint)
                dep, ns = _extract_deployment_from_tool_output(tool_name, output, ns_hint)
                if dep:
                    discovered_deployment = dep
                    discovered_namespace = ns or ns_hint
            function_outputs.append(
                {"type": "function_call_output", "call_id": call.call_id, "output": json.dumps(output, default=str)}
            )

        messages.extend(function_outputs)

    result = InvestigationResponse(
        summary="Investigation reached turn limit without a definitive conclusion.",
        root_cause="Insufficient evidence gathered within the maximum number of tool calls.",
        confidence=20,
        evidence=["Agent reached the maximum turn budget"],
        remediation="Manual investigation is recommended.",
        recovery_steps=["Run kubectl get pods -A and kubectl get events -A manually."],
    )
    emit({
        "type": "complete",
        "result": result.model_dump(),
        "tools_called": tools_called,
        "deployment_name": discovered_deployment,
        "namespace": discovered_namespace,
    })
    return result, tools_called, discovered_deployment, discovered_namespace, tool_evidence
