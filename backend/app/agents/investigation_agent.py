"""Investigation agent orchestration for OpsPilot AI.

This layer coordinates tool selection, prompt building, and model invocation.
It currently uses mock Kubernetes tool data and will later be extended with
real infrastructure-backed tools without changing the agent contract.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.exceptions import OpsPilotError
from app.core.logging import get_logger
from app.schemas.investigation import InvestigationRequest, InvestigationResponse
from app.services.openai_service import OpenAIService
from app.tools.kubernetes import PodTool
from app.tools.registry import ToolRegistry

from .base_agent import BaseAgent
from .prompt_builder import PromptBuilder, PromptBundle, ToolContextItem

logger = get_logger(__name__)


class InvestigationAgentError(OpsPilotError):
    """Base error for agent orchestration failures."""


class InvestigationToolError(InvestigationAgentError):
    """Raised when a tool fails or returns unusable output."""


class InvestigationPromptError(InvestigationAgentError):
    """Raised when prompt creation fails."""


class InvestigationAgent(BaseAgent):
    """Coordinate tool usage and OpenAI reasoning for investigations."""

    def __init__(
        self,
        *,
        tool_registry: ToolRegistry,
        openai_service: OpenAIService,
        prompt_builder: PromptBuilder | None = None,
    ) -> None:
        self.tool_registry = tool_registry
        self.openai_service = openai_service
        self.prompt_builder = prompt_builder or PromptBuilder()

    def investigate(self, request: InvestigationRequest) -> InvestigationResponse:
        incident = request.incident.strip()
        if not incident:
            raise InvestigationPromptError(
                "Incident must not be empty.",
                status_code=422,
            )

        logger.info(
            "investigation_agent_incident_received",
            extra={"incident": incident},
        )

        tool_outputs = self._collect_tool_outputs(incident)
        prompt_bundle = self._build_prompts(incident, tool_outputs)

        logger.info(
            "investigation_agent_prompt_created",
            extra={
                "incident": incident,
                "tool_count": len(tool_outputs),
                "tools": [item.tool_name for item in tool_outputs],
            },
        )
        logger.info(
            "investigation_agent_openai_request",
            extra={
                "incident": incident,
                "tool_count": len(tool_outputs),
            },
        )

        response = self.openai_service.generate_investigation_response(
            incident=incident,
            system_prompt=prompt_bundle.system_prompt,
            user_prompt=prompt_bundle.user_prompt,
        )

        logger.info(
            "investigation_agent_response_received",
            extra={
                "incident": incident,
                "confidence": response.confidence,
            },
        )
        return response

    def _build_prompts(
        self,
        incident: str,
        tool_outputs: list[ToolContextItem],
    ) -> PromptBundle:
        try:
            return self.prompt_builder.build(
                incident=incident,
                tool_outputs=tool_outputs,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "investigation_agent_prompt_build_failed",
                extra={"incident": incident, "error_type": exc.__class__.__name__},
            )
            raise InvestigationPromptError(
                "Failed to build investigation prompts.",
                status_code=500,
            ) from exc

    def _collect_tool_outputs(self, incident: str) -> list[ToolContextItem]:
        outputs: list[ToolContextItem] = []
        lowered_incident = incident.lower()

        if not self._should_use_pod_tool(lowered_incident):
            return outputs

        try:
            pod_tool = self.tool_registry.get("kubernetes.pod")
        except KeyError:
            logger.info(
                "investigation_agent_tool_unavailable",
                extra={"incident": incident, "tool_name": "kubernetes.pod"},
            )
            return outputs

        if not isinstance(pod_tool, PodTool):
            logger.info(
                "investigation_agent_tool_skipped",
                extra={
                    "incident": incident,
                    "tool_name": pod_tool.name,
                    "reason": "unsupported_tool_type",
                },
            )
            return outputs

        try:
            pods_payload = pod_tool.execute(operation="get_pods")
            self._assert_json_serializable(pods_payload)
            outputs.append(
                ToolContextItem(
                    tool_name=pod_tool.name,
                    operation="get_pods",
                    output=pods_payload,
                )
            )
            logger.info(
                "investigation_agent_tool_executed",
                extra={
                    "incident": incident,
                    "tool_name": pod_tool.name,
                    "operation": "get_pods",
                },
            )

            pod_name = self._select_pod_name(lowered_incident, pods_payload)
            if pod_name is None:
                return outputs

            pod_detail_payload = pod_tool.execute(operation="describe_pod", name=pod_name)
            self._assert_json_serializable(pod_detail_payload)
            outputs.append(
                ToolContextItem(
                    tool_name=pod_tool.name,
                    operation="describe_pod",
                    output=pod_detail_payload,
                )
            )
            logger.info(
                "investigation_agent_tool_executed",
                extra={
                    "incident": incident,
                    "tool_name": pod_tool.name,
                    "operation": "describe_pod",
                    "pod_name": pod_name,
                },
            )
            return outputs
        except InvestigationToolError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "investigation_agent_tool_failed",
                extra={
                    "incident": incident,
                    "tool_name": pod_tool.name,
                    "error_type": exc.__class__.__name__,
                },
            )
            raise InvestigationToolError(
                "A tool execution failed while gathering Kubernetes evidence.",
                status_code=502,
            ) from exc

    @staticmethod
    def _should_use_pod_tool(incident: str) -> bool:
        keywords = (
            "crashloopbackoff",
            "imagepullbackoff",
            "pending",
            "oomkilled",
            "unknown",
            "pod",
            "container",
            "restart",
        )
        return any(keyword in incident for keyword in keywords)

    @staticmethod
    def _select_pod_name(incident: str, pods_payload: dict[str, Any]) -> str | None:
        pods = pods_payload.get("pods", [])
        if not isinstance(pods, list):
            raise InvestigationToolError(
                "Pod tool returned an invalid pod list.",
                status_code=502,
            )

        status_priority = [
            "CrashLoopBackOff",
            "ImagePullBackOff",
            "Pending",
            "OOMKilled",
            "Unknown",
        ]

        for status in status_priority:
            if status.lower() in incident:
                for pod in pods:
                    if isinstance(pod, dict) and pod.get("status") == status:
                        return pod.get("name")

        for pod in pods:
            if isinstance(pod, dict) and isinstance(pod.get("status"), str):
                if pod["status"].lower() in incident:
                    return pod.get("name")

        return None

    @staticmethod
    def _assert_json_serializable(value: Any) -> None:
        try:
            json.dumps(value)
        except TypeError as exc:
            raise InvestigationToolError(
                "Tool output must be JSON serializable.",
                status_code=502,
            ) from exc


def create_default_investigation_agent(openai_service: OpenAIService) -> InvestigationAgent:
    """Build the default agent stack used by the current backend service."""

    registry = ToolRegistry([PodTool()])
    return InvestigationAgent(tool_registry=registry, openai_service=openai_service)

