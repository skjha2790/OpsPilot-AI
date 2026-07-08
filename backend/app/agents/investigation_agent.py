"""Investigation agent orchestration for OpsPilot AI.

The agent is intentionally thin in this milestone: it provides the stable
entrypoint that receives a request, logs the incident, and delegates the full
workflow to the investigation workflow layer.
"""

from __future__ import annotations

from app.agents.base_agent import BaseAgent
from app.agents.prompt_builder import PromptBuilder
from app.core.exceptions import OpsPilotError
from app.core.logging import get_logger
from app.schemas.investigation import InvestigationRequest, InvestigationResponse
from app.services.openai_service import OpenAIService
from app.tools.registry import ToolRegistry
from app.workflows.investigation_workflow import InvestigationWorkflow, InvestigationWorkflowError

logger = get_logger(__name__)


class InvestigationAgentError(OpsPilotError):
    """Base error for agent orchestration failures."""


class InvestigationAgent(BaseAgent):
    """Coordinate the investigation workflow for the backend service."""

    def __init__(
        self,
        *,
        tool_registry: ToolRegistry,
        openai_service: OpenAIService,
        prompt_builder: PromptBuilder | None = None,
        workflow: InvestigationWorkflow | None = None,
    ) -> None:
        self.tool_registry = tool_registry
        self.openai_service = openai_service
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.workflow = workflow or InvestigationWorkflow(
            tool_registry=tool_registry,
            prompt_builder=self.prompt_builder,
        )

    def investigate(self, request: InvestigationRequest) -> InvestigationResponse:
        incident = request.incident.strip()
        if not incident:
            raise InvestigationAgentError(
                "Incident must not be empty.",
                status_code=422,
            )

        logger.info(
            "investigation_agent_incident_received",
            extra={"incident": incident},
        )

        try:
            return self.workflow.run(request, self.openai_service)
        except InvestigationWorkflowError:
            raise
        except OpsPilotError:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "investigation_agent_failed",
                extra={"incident": incident, "error_type": exc.__class__.__name__},
            )
            raise InvestigationAgentError(
                "The investigation agent failed to complete the workflow.",
                status_code=500,
            ) from exc


def create_default_investigation_agent(openai_service: OpenAIService) -> InvestigationAgent:
    """Build the default agent stack used by the current backend service."""

    from app.tools.kubernetes import PodTool

    registry = ToolRegistry([PodTool()])
    return InvestigationAgent(tool_registry=registry, openai_service=openai_service)

