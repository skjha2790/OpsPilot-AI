"""Incident report generation layer for OpsPilot AI.

The report layer is backend-only and produces JSON-serializable structured
incident reports after the remediation recommendation engine completes.
Future Markdown, HTML, and PDF exporters can reuse the shared templates in
this package without changing the investigation workflow.
"""

from app.reports.generator import ReportGenerator, ReportGeneratorError
from app.reports.models import (
    IncidentReport,
    InvestigationMetadata,
    KubernetesEvidence,
    ReportTimelineEntry,
    TimeSavingsEstimate,
)

__all__ = [
    "IncidentReport",
    "InvestigationMetadata",
    "KubernetesEvidence",
    "ReportGenerator",
    "ReportGeneratorError",
    "ReportTimelineEntry",
    "TimeSavingsEstimate",
]
