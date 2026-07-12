"""Real agentic investigation loop using OpenAI tool/function calling.

The model decides which Kubernetes tools to call and in what order based on
the evidence it collects each turn. This is genuine agentic behaviour: no
keyword matching, no fixed pipeline. The loop runs until the model decides it
has sufficient evidence or until the turn budget is exhausted.

An optional event_callback receives structured progress events so callers
can stream them as Server-Sent Events to the frontend.
"""

from __future__ import annotations

import json
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
        "description": (
            "List all pods and their current phase, restart count, and waiting reason "
            "in a Kubernetes namespace. Call this first when investigating any incident."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "namespace": {
                    "type": "string",
                    "description": "Kubernetes namespace to query. Use 'default' if unsure.",
                }
            },
            "required": ["namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_pod_logs",
        "description": (
            "Fetch recent logs from a specific pod. When a pod is in CrashLoopBackOff "
            "always request previous=true to get the logs from the crashed container."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Pod name"},
                "namespace": {"type": "string", "description": "Pod namespace"},
                "previous": {
                    "type": "boolean",
                    "description": "True to get logs from the previously crashed container",
                },
            },
            "required": ["name", "namespace", "previous"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "describe_pod",
        "description": (
            "Get detailed pod information: container states, exit codes, conditions, "
            "and recent pod-level events. Useful for OOMKilled and ImagePullBackOff."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Pod name"},
                "namespace": {"type": "string", "description": "Pod namespace"},
            },
            "required": ["name", "namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_events",
        "description": (
            "Fetch recent Kubernetes events for a namespace. Best for scheduling failures, "
            "image pull errors, ConfigMap/Secret mount failures, and ingress issues."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "namespace": {"type": "string", "description": "Kubernetes namespace"},
            },
            "required": ["namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_deployments",
        "description": (
            "Get deployment names, images, desired vs ready replica counts, and conditions. "
            "Use when a rollout may have failed or when the image reference needs checking."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "namespace": {"type": "string", "description": "Kubernetes namespace"},
            },
            "required": ["namespace"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "get_nodes",
        "description": (
            "Get node readiness and resource pressure (memory, disk, PID). "
            "Use when pods are stuck Pending or when node eviction events appear."
        ),
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
You are OpsPilot AI — an autonomous Kubernetes SRE investigation agent.

Your task is to investigate a Kubernetes incident by calling tools to gather \
real evidence from the cluster, then reason to a confident root cause.

Investigation rules:
- Always start with get_pods to see the current cluster state.
- Choose subsequent tools based on what the evidence tells you — not a fixed order.
- If a pod is crashing, call get_pod_logs with previous=true.
- If pods are Pending, check get_events and get_nodes for scheduling failures.
- If you see image pull errors in events, call get_deployments to confirm the image.
- Stop calling tools as soon as you have sufficient evidence. Be efficient.
- If evidence is insufficient after all reasonable tool calls, say so with low confidence.
- Never invent evidence. Only cite data you actually received from a tool.

When you have enough evidence, respond ONLY with valid JSON (no markdown, no preamble):

{
  "summary": "<one sentence executive summary>",
  "root_cause": "<specific root cause based on real evidence found>",
  "confidence": <integer 0-100>,
  "evidence": ["<fact from tool output 1>", "<fact from tool output 2>", ...],
  "remediation": "<primary recommended action>",
  "recovery_steps": ["<step 1>", "<step 2>", ...]
}
"""


def _extract_deployment_from_tool_output(
    tool_name: str,
    output: Any,
    namespace_hint: str,
) -> tuple[str | None, str | None]:
    """Extract the first unhealthy or relevant deployment name and namespace
    from a real tool result. Returns (deployment_name, namespace)."""
    if tool_name == "get_pods":
        pods = output.get("pods", []) if isinstance(output, dict) else []
        ns = output.get("namespace", namespace_hint) if isinstance(output, dict) else namespace_hint
        # Prefer a pod that is crashing or not ready
        for pod in pods:
            if not isinstance(pod, dict):
                continue
            if pod.get("reason") in (
                "CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull",
                "OOMKilled", "Error", "CreateContainerConfigError",
            ) or pod.get("restarts", 0) > 3:
                raw_name: str = pod.get("name", "")
                # Pod names follow <deployment>-<replicaset-hash>-<pod-hash>
                # Strip the last two dash-separated tokens to get deployment name.
                parts = raw_name.rsplit("-", 2)
                if len(parts) >= 3:
                    return parts[0], ns
                if len(parts) == 2:
                    return parts[0], ns
        # Fallback: first pod in the list
        if pods and isinstance(pods[0], dict):
            raw_name = pods[0].get("name", "")
            ns_val = output.get("namespace", namespace_hint) if isinstance(output, dict) else namespace_hint
            parts = raw_name.rsplit("-", 2)
            return (parts[0] if len(parts) >= 2 else raw_name), ns_val

    if tool_name == "get_deployments":
        deps = output.get("deployments", []) if isinstance(output, dict) else []
        ns = output.get("namespace", namespace_hint) if isinstance(output, dict) else namespace_hint
        # Prefer a deployment where ready < desired
        for dep in deps:
            if not isinstance(dep, dict):
                continue
            desired = dep.get("desired") or 1
            ready = dep.get("ready") or 0
            if ready < desired:
                return dep.get("name"), dep.get("namespace") or ns
        # Fallback: first deployment
        if deps and isinstance(deps[0], dict):
            return deps[0].get("name"), deps[0].get("namespace") or ns

    return None, None


def _dispatch(name: str, arguments: dict[str, Any], registry: ToolRegistry) -> Any:
    """Route a model tool call to the registered tool implementation."""
    try:
        if name == "get_pods":
            return registry.get("kubernetes.pod").execute(
                operation="get_pods",
                namespace=arguments.get("namespace", "default"),
            )
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
            return registry.get("kubernetes.event").execute(
                operation="get_events",
                namespace=arguments.get("namespace", "default"),
            )
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


def run_agentic_loop(
    incident: str,
    registry: ToolRegistry,
    openai_client: Any,
    model: str,
    event_callback: Callable[[dict[str, Any]], None] | None = None,
) -> tuple[InvestigationResponse, list[str], str | None, str | None]:
    """Run the agentic investigation loop.

    Returns:
        (InvestigationResponse, tools_called, deployment_name, namespace)

    deployment_name and namespace are extracted from real tool results —
    not inferred from the incident text — so remediation targets the
    actual affected workload the agent discovered in the cluster.

    If event_callback is provided it is called with structured progress
    events suitable for Server-Sent Events streaming.
    """

    def emit(event: dict[str, Any]) -> None:
        if event_callback:
            try:
                event_callback(event)
            except Exception:
                pass

    messages: list[Any] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Investigate this incident: {incident}"},
    ]

    tools_called: list[str] = []
    # Track the deployment and namespace the agent actually found.
    discovered_deployment: str | None = None
    discovered_namespace: str | None = None

    emit({"type": "agent_step", "agent": "Incident Intake Agent", "status": "completed"})
    emit({"type": "agent_step", "agent": "Incident Classification Agent", "status": "running"})

    for turn in range(MAX_TURNS):
        logger.info("agentic_loop_turn", extra={"turn_num": turn, "inc": incident[:50]})

        emit({"type": "agent_step", "agent": "Incident Classification Agent", "status": "completed"})
        emit({"type": "agent_step", "agent": "Kubernetes Discovery Agent", "status": "running"})

        response = openai_client.responses.create(
            model=model,
            input=messages,
            tools=TOOLS_SCHEMA,
        )

        # Preserve ALL output items including reasoning — required by the API.
        messages.extend(response.output)

        tool_calls = [
            item
            for item in response.output
            if hasattr(item, "type") and item.type == "function_call"
        ]

        if not tool_calls:
            logger.info(
                "agentic_loop_concluded",
                extra={
                    "turns": turn + 1,
                    "tools_called": tools_called,
                    "deployment": discovered_deployment,
                    "namespace": discovered_namespace,
                },
            )
            emit({"type": "agent_step", "agent": "Root Cause Analysis Agent", "status": "running"})

            raw = response.output_text
            payload = json.loads(raw)
            result = InvestigationResponse.model_validate(payload)

            # If the agent did not call get_deployments but we found a deployment
            # from pod names, also try to extract from the model's recovery_steps
            # as a last resort.
            if not discovered_deployment:
                discovered_deployment = _extract_deployment_from_recovery_steps(
                    result.recovery_steps
                )

            emit({"type": "agent_step", "agent": "Root Cause Analysis Agent", "status": "completed"})
            emit({"type": "agent_step", "agent": "Risk Assessment Agent", "status": "completed"})
            emit({"type": "agent_step", "agent": "Report Generation Agent", "status": "running"})
            emit({
                "type": "complete",
                "result": result.model_dump(),
                "tools_called": tools_called,
                "deployment_name": discovered_deployment,
                "namespace": discovered_namespace,
            })
            return result, tools_called, discovered_deployment, discovered_namespace

        tool_results: list[dict[str, Any]] = []
        for call in tool_calls:
            args = (
                json.loads(call.arguments)
                if isinstance(call.arguments, str)
                else call.arguments
            )
            tool_name = call.name
            tools_called.append(tool_name)

            logger.info(
                "agentic_tool_call",
                extra={"tool": tool_name, "tool_args": str(args), "turn": turn},
            )
            emit({"type": "tool_call", "tool": tool_name, "tool_args": str(args)})

            agent_label = _tool_to_agent_label(tool_name)
            emit({"type": "agent_step", "agent": agent_label, "status": "running"})

            output = _dispatch(tool_name, args, registry)

            # Extract real deployment name and namespace from this tool's output.
            if discovered_deployment is None:
                ns_hint = args.get("namespace", "default")
                dep, ns = _extract_deployment_from_tool_output(tool_name, output, ns_hint)
                if dep:
                    discovered_deployment = dep
                    discovered_namespace = ns or ns_hint
                    logger.info(
                        "agentic_deployment_discovered",
                        extra={
                            "deployment": discovered_deployment,
                            "namespace": discovered_namespace,
                            "from_tool": tool_name,
                        },
                    )

            emit({"type": "tool_result", "tool": tool_name, "output": output})
            emit({"type": "agent_step", "agent": agent_label, "status": "completed"})

            tool_results.append({
                "type": "function_call_output",
                "call_id": call.call_id,
                "output": json.dumps(output, default=str),
            })

        messages.extend(tool_results)

    # Turn budget exhausted.
    logger.warning("agentic_loop_turn_budget_exhausted", extra={"incident": incident})
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
    return result, tools_called, discovered_deployment, discovered_namespace


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
    """Parse recovery_steps for a deployment name as a last resort.

    Looks for patterns like 'kubectl rollout restart deployment/NAME'
    or 'kubectl ... deploy/NAME'.
    """
    import re

    for step in steps:
        match = re.search(
            r"deployment[s]?/([a-z0-9][a-z0-9-]{1,52})",
            step,
            re.IGNORECASE,
        )
        if match:
            return match.group(1)
        match = re.search(
            r"deploy/([a-z0-9][a-z0-9-]{1,52})",
            step,
            re.IGNORECASE,
        )
        if match:
            return match.group(1)
    return None
