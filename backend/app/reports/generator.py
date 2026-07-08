"""Incident report generator for OpsPilot AI.

The generator assembles a structured incident report after the investigation
workflow and remediation engine complete. It intentionally keeps the output in
memory and JSON serializable so future exporters can render the same report to
Markdown, HTML, or PDF without changing the backend contract.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from app.core.exceptions import OpsPilotError
from app.core.logging import get_logger
from app.remediation.models import RemediationAction
from app.reports.models import IncidentReport, InvestigationMetadata, KubernetesEvidence, TimeSavingsEstimate
from app.reports.templates import build_investigation_timeline, build_preventive_actions, estimate_time_saved_minutes

logger = get_logger(__name__)


class ReportGeneratorError(OpsPilotError):
    """Base error for report generation failures."""


class ReportGenerator:
    """Build structured incident reports from investigation outputs."""

    def generate(
        self,
        *,
        incident: str,
        investigation: Any,
        evidence: dict[str, Any],
        remediation_actions: list[RemediationAction],
        metadata: dict[str, Any] | None = None,
    ) -> IncidentReport:
        """Generate a fully structured incident report."""
        incident_title = incident.strip() or getattr(investigation, "summary", "Incident")
        generated_at = datetime.now(timezone.utc)
        report_id = uuid4()
        failure_count = self._count_failures(evidence)
        selected_tools = self._get_selected_tools(evidence)
        evidence_keys = list((evidence.get("tool_results") or {}).keys())

        kubernetes_evidence = KubernetesEvidence(
            incident=incident_title,
            selected_tools=selected_tools,
            tool_results=evidence.get("tool_results", {}),
            failure_count=failure_count,
        )
        manual_minutes, automated_minutes, saved_minutes = estimate_time_saved_minutes(
            remediation_actions=remediation_actions,
            failure_count=failure_count,
        )

        metadata_payload: dict[str, Any] = dict(metadata or {})
        metadata_payload.update(
            {
                "selected_tools": selected_tools,
                "remediation_action_count": len(remediation_actions),
                "failure_count": failure_count,
                "evidence_keys": evidence_keys,
            }
        )

        report = IncidentReport(
            report_id=report_id,
            timestamp=generated_at,
            incident_title=incident_title,
            executive_summary=getattr(investigation, "summary", ""),
            root_cause=getattr(investigation, "root_cause", ""),
            investigation_timeline=build_investigation_timeline(
                selected_tools=selected_tools,
                remediation_actions=remediation_actions,
                failure_count=failure_count,
            ),
            kubernetes_evidence=kubernetes_evidence,
            ai_confidence=getattr(investigation, "confidence", 0),
            recommended_remediation=remediation_actions,
            recovery_steps=list(getattr(investigation, "recovery_steps", []) or []),
            preventive_actions=build_preventive_actions(remediation_actions),
            estimated_time_saved=TimeSavingsEstimate(
                manual_investigation_minutes=manual_minutes,
                automated_investigation_minutes=automated_minutes,
                estimated_time_saved_minutes=saved_minutes,
                summary=(
                    f"Estimated to save about {saved_minutes} minute(s) versus a "
                    f"{manual_minutes}-minute manual investigation."
                ),
            ),
            investigation_metadata=InvestigationMetadata.model_validate(metadata_payload),
        )

        logger.info(
            "incident_report_generated",
            extra={
                "report_id": str(report.report_id),
                "incident": incident_title,
                "ai_confidence": report.ai_confidence,
                "remediation_action_count": len(remediation_actions),
                "selected_tools": selected_tools,
            },
        )
        return report

    @staticmethod
    def _count_failures(evidence: dict[str, Any]) -> int:
        failures = evidence.get("failures", [])
        return len(failures) if isinstance(failures, list) else 0

    @staticmethod
    def _get_selected_tools(evidence: dict[str, Any]) -> list[str]:
        selected_tools = evidence.get("selected_tools", [])
        if isinstance(selected_tools, list):
            return [str(tool) for tool in selected_tools]
        return []

    @staticmethod
    def to_json(report: IncidentReport) -> dict[str, Any]:
        """Return a JSON-serializable report payload."""
        return report.model_dump(mode="json")

    @staticmethod
    def build_template_context(report: IncidentReport):
        """Expose a shared template context for future exporters."""
        from app.reports.templates import build_template_context

        return build_template_context(report)
