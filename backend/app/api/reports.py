"""Report retrieval endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, Response

from app.db.database import get_report

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


@router.get("/{investigation_id}")
def get_investigation_report(
    investigation_id: int,
    format: str = Query(default="json", pattern="^(json|html|pdf)$"),
):
    report = get_report(investigation_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if format == "html":
        return HTMLResponse(report["report_html"])
    if format == "pdf":
        pdf_bytes = report.get("report_pdf")
        if not pdf_bytes:
            raise HTTPException(status_code=404, detail="PDF report not found.")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="opspilot-report-{investigation_id}.pdf"'},
        )

    return JSONResponse(report["report_json"])
