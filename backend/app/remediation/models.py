"""Pydantic models for remediation recommendations.

The current milestone keeps remediation advisory-only. These models define the
shape of the recommendation payload that future execution workflows can consume
once explicit human approval is introduced.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class RemediationStatus(str, Enum):
    """Lifecycle states for remediation actions."""

    PendingApproval = "PendingApproval"
    Approved = "Approved"
    Rejected = "Rejected"
    Executed = "Executed"
    Skipped = "Skipped"


class RiskLevel(str, Enum):
    """Risk profile associated with a remediation action."""

    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


class RemediationAction(BaseModel):
    """Structured advisory remediation recommendation."""

    id: str = Field(description="Unique action identifier.")
    title: str = Field(description="Short title for the recommendation.")
    description: str = Field(description="Detailed recommendation description.")
    reason: str = Field(description="Reason the recommendation is suggested.")
    confidence: int = Field(ge=0, le=100, description="Confidence score from 0 to 100.")
    risk_level: RiskLevel = Field(description="Estimated risk for applying the action.")
    approval_required: bool = Field(default=True, description="Whether human approval is required.")
    status: RemediationStatus = Field(
        default=RemediationStatus.PendingApproval,
        description="Current approval/execution status.",
    )
    estimated_duration: str = Field(description="Estimated time needed to review or apply.")
    kubectl_command: str = Field(description="Suggested kubectl command for the action.")
    rollback_command: str = Field(description="Suggested rollback command.")
    category: str = Field(description="Operational category of the recommendation.")

    model_config = ConfigDict(extra="forbid")


class RemediationEvidence(BaseModel):
    """Normalized evidence record passed into the remediation engine."""

    incident: str
    tool_results: dict[str, Any] = Field(default_factory=dict)
    selected_tools: list[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")
