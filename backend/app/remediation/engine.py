"""Advisory remediation recommendation engine.

The engine converts investigation outcomes and Kubernetes evidence into a
structured list of remediation actions. It does not execute anything. The
result is intentionally advisory-only so a future M8 execution engine can
replace this module without changing upstream APIs.
"""

from __future__ import annotations

import re
from typing import Any

from app.core.exceptions import OpsPilotError
from app.core.logging import get_logger
from app.remediation.models import RemediationAction, RemediationEvidence, RemediationStatus
from app.remediation.rules import GENERIC_TEMPLATES, RULES, RemediationTemplate, build_rule_context

logger = get_logger(__name__)


class RemediationEngineError(OpsPilotError):
    """Base error for remediation engine failures."""


class RemediationEngine:
    """Generate advisory remediation actions from investigation output."""

    def generate(
        self,
        *,
        investigation: Any,
        evidence: dict[str, Any],
    ) -> list[RemediationAction]:
        """Return a list of remediation actions for the investigation result."""
        normalized_evidence = self._normalize_evidence(investigation, evidence)
        context = build_rule_context(investigation, normalized_evidence.model_dump(mode="json"))

        logger.info(
            "remediation_engine_evaluating",
            extra={
                "incident": normalized_evidence.incident,
                "selected_tools": normalized_evidence.selected_tools,
            },
        )

        templates = self._select_templates(context)
        actions = [
            self._to_action(template=template, index=index, incident=normalized_evidence.incident)
            for index, template in enumerate(templates, start=1)
        ]

        logger.info(
            "remediation_engine_generated",
            extra={
                "incident": normalized_evidence.incident,
                "action_count": len(actions),
                "categories": [action.category for action in actions],
            },
        )
        return actions

    def render_summary(self, actions: list[RemediationAction]) -> str:
        """Render a concise human-readable remediation summary."""
        if not actions:
            return "No remediation recommendations were generated."

        ordered = [f"{action.title}: {action.description}" for action in actions]
        return "Pending approval remediation recommendations: " + " ".join(ordered)

    def _select_templates(self, context: str) -> list[RemediationTemplate]:
        for rule in RULES:
            if rule.matches(context):
                logger.info(
                    "remediation_engine_rule_matched",
                    extra={"rule_name": rule.name},
                )
                return rule.templates

        logger.info(
            "remediation_engine_rule_fallback",
            extra={"fallback": "generic_investigation"},
        )
        return GENERIC_TEMPLATES

    def _to_action(self, *, template: RemediationTemplate, index: int, incident: str) -> RemediationAction:
        safe_incident = self._slugify(incident)
        safe_title = self._slugify(template.title)
        action_id = f"{safe_incident}-{safe_title}-{index}"

        return RemediationAction(
            id=action_id,
            title=template.title,
            description=template.description,
            reason=template.reason,
            confidence=template.confidence,
            risk_level=template.risk_level,
            approval_required=True,
            status=RemediationStatus.PendingApproval,
            estimated_duration=template.estimated_duration,
            kubectl_command=template.kubectl_command,
            rollback_command=template.rollback_command,
            category=template.category,
        )

    @staticmethod
    def _normalize_evidence(investigation: Any, evidence: dict[str, Any]) -> RemediationEvidence:
        incident = evidence.get("incident") or getattr(investigation, "summary", None) or getattr(
            investigation,
            "root_cause",
            None,
        ) or "incident"
        selected_tools = []
        tool_results = evidence.get("tool_results", {})

        if isinstance(evidence.get("selected_tools"), list):
            selected_tools = [str(item) for item in evidence["selected_tools"]]

        if not isinstance(tool_results, dict):
            tool_results = {"raw": tool_results}

        return RemediationEvidence(
            incident=str(incident),
            tool_results=tool_results,
            selected_tools=selected_tools,
        )

    @staticmethod
    def _slugify(value: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
        return slug or "incident"
