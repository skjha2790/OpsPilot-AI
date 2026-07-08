"""Pydantic models for incident reports.

These models define the structured report emitted after each investigation.
They remain JSON serializable so future exporters can render them to Markdown,
HTML, or PDF without altering the backend contract.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.remediation.models import RemediationAction


class ReportTimelineEntry(BaseModel):
    """A single step in the investigation timeline."""

    step: str = Field(description="Timeline step title.")
    status: Literal["completed", "advisory"] = Field(description="Step status.")
    details: str | None = Field(default=None, description="Additional timeline context.")

    model_config = ConfigDict(extra="forbid")


class KubernetesEvidence(BaseModel):
    """Structured Kubernetes evidence used in the incident report."""

    incident: str = Field(description="Incident label used during the investigation.")
    selected_tools: list[str] = Field(default_factory=list, description="Tools selected by the workflow.")
    tool_results: dict[str, Any] = Field(default_factory=dict, description="Serialized tool outputs.")
    failure_count: int = Field(default=0, ge=0, description="Number of tool failures recorded.")

    model_config = ConfigDict(extra="forbid")


class InvestigationMetadata(BaseModel):
    """Operational metadata describing how the report was generated."""

    workflow_name: str = Field(default="investigation_workflow", description="Workflow name.")
    workflow_version: str = Field(default="m8", description="Workflow milestone or version.")
    generated_by: str = Field(default="opsilot-ai", description="System that generated the report.")
    selected_tools: list[str] = Field(default_factory=list, description="Tools selected for the incident.")
    remediation_action_count: int = Field(default=0, ge=0, description="Number of remediation recommendations generated.")
    failure_count: int = Field(default=0, ge=0, description="Number of tool failures recorded during the investigation.")
    evidence_keys: list[str] = Field(default_factory=list, description="Evidence keys captured in the workflow.")
    openai_model: str | None = Field(default=None, description="Model used by the investigation service.")

    model_config = ConfigDict(extra="allow")


class TimeSavingsEstimate(BaseModel):
    """Estimate of time saved by using the autonomous investigation pipeline."""

    manual_investigation_minutes: int = Field(ge=0, description="Estimated duration for a manual investigation.")
    automated_investigation_minutes: int = Field(ge=0, description="Estimated duration for the automated workflow.")
    estimated_time_saved_minutes: int = Field(ge=0, description="Estimated minutes saved relative to manual work.")
    summary: str = Field(description="Human-readable time savings summary.")

    model_config = ConfigDict(extra="forbid")


class IncidentReport(BaseModel):
    """Structured incident report generated after remediation recommendations."""

    report_id: UUID = Field(description="Unique identifier for the incident report.")
    timestamp: datetime = Field(description="Report generation timestamp in UTC.")
    incident_title: str = Field(description="Incident title or label.")
    executive_summary: str = Field(description="Executive summary of the investigation.")
    root_cause: str = Field(description="Most likely root cause.")
    investigation_timeline: list[ReportTimelineEntry] = Field(
        default_factory=list,
        description="Chronological investigation timeline.",
    )
    kubernetes_evidence: KubernetesEvidence = Field(description="Structured Kubernetes evidence.")
    ai_confidence: int = Field(ge=0, le=100, description="Confidence score from the AI investigation.")
    recommended_remediation: list[RemediationAction] = Field(
        default_factory=list,
        description="Structured remediation recommendations.",
    )
    recovery_steps: list[str] = Field(default_factory=list, description="Suggested recovery steps.")
    preventive_actions: list[str] = Field(default_factory=list, description="Suggested preventive actions.")
    estimated_time_saved: TimeSavingsEstimate = Field(description="Estimated time saved versus manual investigation.")
    investigation_metadata: InvestigationMetadata = Field(description="Operational metadata for the report.")

    model_config = ConfigDict(extra="forbid")
