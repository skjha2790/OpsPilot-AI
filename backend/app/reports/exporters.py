"""Report exporters for OpsPilot incident reports."""

from __future__ import annotations

import html

from app.reports.models import IncidentReport


def render_html_report(report: IncidentReport) -> str:
    remediation_items = "".join(
        (
            "<li>"
            f"<strong>{html.escape(action.title)}</strong>: "
            f"{html.escape(action.description)}"
            "</li>"
        )
        for action in report.recommended_remediation
    )
    timeline_items = "".join(
        (
            "<li>"
            f"<strong>{html.escape(entry.step)}</strong> "
            f"({html.escape(entry.status)}): {html.escape(entry.details or '')}"
            "</li>"
        )
        for entry in report.investigation_timeline
    )
    recovery_items = "".join(f"<li>{html.escape(step)}</li>" for step in report.recovery_steps)
    preventive_items = "".join(f"<li>{html.escape(step)}</li>" for step in report.preventive_actions)
    evidence_points = report.kubernetes_evidence.tool_results
    evidence_blocks = "".join(
        (
            "<details open>"
            f"<summary>{html.escape(key)}</summary>"
            f"<pre>{html.escape(str(value))}</pre>"
            "</details>"
        )
        for key, value in evidence_points.items()
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpsPilot AI RCA Report</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; padding: 32px; background: #f8fbff; color: #0f172a; }}
    .page {{ max-width: 1080px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 20px 50px rgba(15,23,42,.08); }}
    h1, h2 {{ margin: 0 0 12px; }}
    h1 {{ font-size: 32px; }}
    h2 {{ font-size: 20px; margin-top: 28px; }}
    .meta {{ color: #475569; font-size: 14px; margin-bottom: 20px; }}
    .pill {{ display: inline-block; padding: 6px 12px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
    .card {{ border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; background: #fff; }}
    ul {{ padding-left: 20px; }}
    pre {{ white-space: pre-wrap; overflow-wrap: anywhere; background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 12px; }}
    details {{ border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; padding: 12px 14px; background: #f8fbff; }}
    summary {{ cursor: pointer; font-weight: 700; }}
  </style>
</head>
<body>
  <div class="page">
    <span class="pill">OpsPilot AI RCA Report</span>
    <h1>{html.escape(report.incident_title)}</h1>
    <div class="meta">
      Report ID: {html.escape(str(report.report_id))}<br />
      Generated: {html.escape(report.timestamp.isoformat())}<br />
      Confidence: {report.ai_confidence}%
    </div>

    <div class="grid">
      <section class="card">
        <h2>Executive Summary</h2>
        <p>{html.escape(report.executive_summary)}</p>
      </section>
      <section class="card">
        <h2>Root Cause</h2>
        <p>{html.escape(report.root_cause)}</p>
      </section>
    </div>

    <section class="card">
      <h2>Investigation Timeline</h2>
      <ul>{timeline_items}</ul>
    </section>

    <section class="card">
      <h2>Recommended Remediation</h2>
      <ul>{remediation_items}</ul>
    </section>

    <section class="card">
      <h2>Recovery Steps</h2>
      <ul>{recovery_items}</ul>
    </section>

    <section class="card">
      <h2>Preventive Actions</h2>
      <ul>{preventive_items}</ul>
    </section>

    <section class="card">
      <h2>Kubernetes Evidence</h2>
      {evidence_blocks}
    </section>
  </div>
</body>
</html>
"""


def render_pdf_report(report: IncidentReport) -> bytes:
    """Render a minimal PDF artifact without external PDF libraries."""

    def wrap_line(text: str, width: int = 92) -> list[str]:
        words = text.split()
        if not words:
            return [""]
        lines: list[str] = []
        current = words[0]
        for word in words[1:]:
            candidate = f"{current} {word}"
            if len(candidate) > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        lines.append(current)
        return lines

    def pdf_escape(text: str) -> str:
        return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    lines: list[str] = [
        "OpsPilot AI RCA Report",
        report.incident_title,
        f"Report ID: {report.report_id}",
        f"Generated: {report.timestamp.isoformat()}",
        f"Confidence: {report.ai_confidence}%",
        "",
        "Executive Summary",
        report.executive_summary or "-",
        "",
        "Root Cause",
        report.root_cause or "-",
        "",
        "Recovery Steps",
        *[f"- {step}" for step in report.recovery_steps],
        "",
        "Preventive Actions",
        *[f"- {step}" for step in report.preventive_actions],
        "",
        "Recommended Remediation",
        *[f"- {action.title}: {action.description}" for action in report.recommended_remediation],
        "",
        "Evidence Keys",
        *[f"- {key}" for key in report.kubernetes_evidence.tool_results.keys()],
    ]

    wrapped: list[str] = []
    for line in lines:
        wrapped.extend(wrap_line(line))

    text_commands = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"]
    first = True
    for line in wrapped[:140]:
        if first:
            text_commands.append(f"({pdf_escape(line)}) Tj")
            first = False
        else:
            text_commands.append("T*")
            text_commands.append(f"({pdf_escape(line)}) Tj")
    text_commands.append("ET")
    content = "\n".join(text_commands).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(content)} >>\nstream\n".encode("latin-1") + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    pdf = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("latin-1"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf.extend(
        (
            f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_offset}\n%%EOF"
        ).encode("latin-1")
    )
    return bytes(pdf)
