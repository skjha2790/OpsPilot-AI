"""Remediation recommendation layer for OpsPilot AI.

This package contains advisory-only remediation models and a rule engine that
will later be replaced by an execution layer once human approval workflows are
introduced.
"""

from app.remediation.engine import RemediationEngine, RemediationEngineError
from app.remediation.models import RemediationAction, RemediationStatus, RiskLevel

__all__ = [
    "RemediationAction",
    "RemediationEngine",
    "RemediationEngineError",
    "RemediationStatus",
    "RiskLevel",
]
