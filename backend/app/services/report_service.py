"""Helpers to generate and persist report artifacts for investigations."""

from __future__ import annotations

from typing import Any

from app.db.database import save_report
from app.remediation.engine import RemediationEngine
from app.reports.exporters import render_html_report, render_pdf_report
from app.reports.generator import ReportGenerator
from app.schemas.investigation import InvestigationResponse


def build_and_store_report(
    *,
    investigation_id: int,
    incident: str,
    investigation: InvestigationResponse,
    tools_called: list[str],
    tool_results: dict[str, Any],
    openai_model: str | None,
) -> dict[str, Any]:
    evidence_payload = {
        "incident": incident,
        "selected_tools": tools_called,
        "tool_results": tool_results,
        "failures": [],
    }
    remediation_actions = RemediationEngine().generate(
        investigation=investigation,
        evidence=evidence_payload,
    )
    report = ReportGenerator().generate(
        incident=incident,
        investigation=investigation,
        evidence=evidence_payload,
        remediation_actions=remediation_actions,
        metadata={
            "openai_model": openai_model,
            "selected_tools": tools_called,
            "failure_count": 0,
            "tool_result_keys": list(tool_results.keys()),
            "workflow_version": "production",
        },
    )
    report_json = ReportGenerator.to_json(report)
    report_html = render_html_report(report)
    report_pdf = render_pdf_report(report)
    save_report(
        investigation_id=investigation_id,
        report_json=report_json,
        report_html=report_html,
        report_pdf=report_pdf,
    )
    return {
        "report_id": str(report.report_id),
        "report_json": report_json,
        "report_html": report_html,
        "report_pdf": report_pdf,
    }
