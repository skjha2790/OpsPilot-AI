"""Reusable report templates and helper functions.

This module centralizes canonical report sections and content generation
helpers. Future Markdown, HTML, and PDF exporters should consume these helpers
instead of re-deriving report structure from scratch.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.remediation.models import RemediationAction
from app.reports.models import IncidentReport, ReportTimelineEntry


class ReportSection(BaseModel):
    """Canonical report section used by future exporters."""

    key: str = Field(description="Stable section key.")
    title: str = Field(description="Display title for the section.")
    content: Any = Field(description="JSON-serializable section payload.")

    model_config = ConfigDict(extra="forbid")


class ReportTemplateContext(BaseModel):
    """Shared rendering context for downstream exporters."""

    report_id: str
    sections: list[ReportSection]
    export_formats: list[str] = Field(default_factory=lambda: ["markdown", "html", "pdf"])

    model_config = ConfigDict(extra="forbid")


DEFAULT_MANUAL_INVESTIGATION_MINUTES = 45
DEFAULT_AUTOMATED_BASELINE_MINUTES = 12

PREVENTIVE_ACTION_LIBRARY: dict[str, list[str]] = {
    "workload-recovery": [
        "Add startup and smoke tests to the deployment pipeline.",
        "Validate readiness and liveness probes before releasing to production.",
    ],
    "pod-recovery": [
        "Monitor restart spikes and alert on repeated crashes.",
        "Keep container startup checks in the release checklist.",
    ],
    "diagnostics": [
        "Capture logs and events as part of the incident playbook.",
        "Preserve investigation evidence for future postmortems.",
    ],
    "configuration": [
        "Review probe thresholds and configuration drift during every release.",
        "Add policy checks for workload configuration changes.",
    ],
    "image-validation": [
        "Pin image tags and validate digests in CI.",
        "Block deploys when image references are missing or unverified.",
    ],
    "credentials": [
        "Rotate registry credentials regularly.",
        "Validate imagePullSecret presence before deployment.",
    ],
    "networking": [
        "Monitor registry connectivity and DNS resolution from cluster nodes.",
        "Alert on container registry access failures.",
    ],
    "scheduling": [
        "Track pod scheduling latency and node capacity trends.",
        "Audit resource requests and placement constraints before release.",
    ],
    "capacity": [
        "Maintain buffer capacity for production workloads.",
        "Forecast demand to avoid prolonged Pending states.",
    ],
    "resource-tuning": [
        "Profile memory usage under realistic load before release.",
        "Tune resource limits from actual workload observations.",
    ],
    "resource-observability": [
        "Add memory and CPU dashboards to the service runbook.",
        "Investigate resource trends before they become outages.",
    ],
    "node-isolation": [
        "Automate node health checks and escalation alerts.",
        "Keep cordon procedures documented for on-call use.",
    ],
    "node-recovery": [
        "Use a node recovery playbook with approval gates.",
        "Track node repair time to reduce repeated readiness failures.",
    ],
    "node-diagnostics": [
        "Monitor kubelet health and node runtime logs continuously.",
        "Investigate node heartbeat gaps before they affect workloads.",
    ],
    "release-management": [
        "Use canary or phased rollouts for risky changes.",
        "Keep rollback procedures tested and documented.",
    ],
    "service-routing": [
        "Validate service selectors and endpoints in CI checks.",
        "Monitor endpoint health after every deployment.",
    ],
}

DEFAULT_PREVENTIVE_ACTIONS = [
    "Document the incident and review the corrective actions in the next postmortem.",
    "Keep the incident playbook updated with the evidence collected here.",
]


def build_investigation_timeline(
    *,
    selected_tools: list[str],
    remediation_actions: list[RemediationAction],
    failure_count: int,
) -> list[ReportTimelineEntry]:
    """Build the canonical investigation timeline for report output."""
    tool_summary = ", ".join(selected_tools) if selected_tools else "none"
    remediation_count = len(remediation_actions)

    return [
        ReportTimelineEntry(
            step="Receiving Incident",
            status="completed",
            details="Incident payload received and validated by the backend workflow.",
        ),
        ReportTimelineEntry(
            step="Selecting Tools",
            status="completed",
            details=f"Selected tools: {tool_summary}.",
        ),
        ReportTimelineEntry(
            step="Collecting Kubernetes Evidence",
            status="completed",
            details=f"Collected evidence with {failure_count} recorded tool failure(s).",
        ),
        ReportTimelineEntry(
            step="Building Prompt",
            status="completed",
            details="Aggregated evidence was shaped into the OpenAI prompt context.",
        ),
        ReportTimelineEntry(
            step="Calling OpenAI",
            status="completed",
            details="Responses API returned the incident investigation payload.",
        ),
        ReportTimelineEntry(
            step="Generating Remediation Recommendations",
            status="completed",
            details=f"Generated {remediation_count} advisory remediation action(s).",
        ),
        ReportTimelineEntry(
            step="Generating Incident Report",
            status="completed",
            details="Structured incident report assembled for downstream exporters.",
        ),
    ]


def build_preventive_actions(remediation_actions: list[RemediationAction]) -> list[str]:
    """Derive preventive actions from remediation categories."""
    collected: list[str] = []
    seen: set[str] = set()

    for action in remediation_actions:
        for suggestion in PREVENTIVE_ACTION_LIBRARY.get(action.category, []):
            if suggestion not in seen:
                seen.add(suggestion)
                collected.append(suggestion)

    if not collected:
        return list(DEFAULT_PREVENTIVE_ACTIONS)

    for suggestion in DEFAULT_PREVENTIVE_ACTIONS:
        if suggestion not in seen:
            collected.append(suggestion)

    return collected


def estimate_time_saved_minutes(*, remediation_actions: list[RemediationAction], failure_count: int) -> tuple[int, int, int]:
    """Estimate the manual and automated investigation time."""
    manual_minutes = DEFAULT_MANUAL_INVESTIGATION_MINUTES
    automated_minutes = DEFAULT_AUTOMATED_BASELINE_MINUTES + len(remediation_actions) * 2 + failure_count
    automated_minutes = min(automated_minutes, manual_minutes)
    saved_minutes = max(0, manual_minutes - automated_minutes)
    return manual_minutes, automated_minutes, saved_minutes


def build_template_context(report: IncidentReport) -> ReportTemplateContext:
    """Build a shared exporter context for future Markdown/HTML/PDF renderers."""
    sections = [
        ReportSection(key="summary", title="Executive Summary", content=report.executive_summary),
        ReportSection(key="root_cause", title="Root Cause", content=report.root_cause),
        ReportSection(
            key="timeline",
            title="Investigation Timeline",
            content=[entry.model_dump(mode="json") for entry in report.investigation_timeline],
        ),
        ReportSection(
            key="evidence",
            title="Kubernetes Evidence",
            content=report.kubernetes_evidence.model_dump(mode="json"),
        ),
        ReportSection(
            key="remediation",
            title="Recommended Remediation",
            content=[action.model_dump(mode="json") for action in report.recommended_remediation],
        ),
    ]

    return ReportTemplateContext(report_id=str(report.report_id), sections=sections)
