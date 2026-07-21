"""SQLite persistence layer for investigations, RCAs, and remediation actions.

All investigations are stored with their evidence so the agent can compare
new incidents against past root causes before concluding.
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_PATH = Path("/app/data/opspilot.db")


def _ensure_column(conn: sqlite3.Connection, table_name: str, column_name: str, column_sql: str) -> None:
    existing = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    if column_name not in existing:
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS investigations (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at      TEXT    NOT NULL,
                incident        TEXT    NOT NULL,
                severity        TEXT    NOT NULL DEFAULT 'P1',
                summary         TEXT,
                root_cause      TEXT,
                confidence      INTEGER,
                evidence        TEXT,
                remediation     TEXT,
                recovery_steps  TEXT,
                tools_called    TEXT,
                real_k8s        INTEGER NOT NULL DEFAULT 0,
                namespace       TEXT,
                deployment_name TEXT,
                approval_status TEXT    NOT NULL DEFAULT 'pending'
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_investigations_incident
            ON investigations (incident)
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_investigations_root_cause
            ON investigations (root_cause)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                investigation_id  INTEGER PRIMARY KEY,
                created_at        TEXT    NOT NULL,
                report_json       TEXT    NOT NULL,
                report_html       TEXT    NOT NULL,
                report_pdf        BLOB,
                FOREIGN KEY (investigation_id) REFERENCES investigations (id)
            )
        """)
        _ensure_column(conn, "reports", "report_pdf", "report_pdf BLOB")
        conn.commit()


def save_investigation(
    *,
    incident: str,
    severity: str,
    response: Any,
    tools_called: list[str],
    real_k8s: bool,
    namespace: str | None = None,
    deployment_name: str | None = None,
) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO investigations
            (created_at, incident, severity, summary, root_cause, confidence,
             evidence, remediation, recovery_steps, tools_called, real_k8s,
             namespace, deployment_name, approval_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now(timezone.utc).isoformat(),
                incident,
                severity,
                getattr(response, "summary", ""),
                getattr(response, "root_cause", ""),
                getattr(response, "confidence", 0),
                json.dumps(list(getattr(response, "evidence", []))),
                getattr(response, "remediation", ""),
                json.dumps(list(getattr(response, "recovery_steps", []))),
                json.dumps(tools_called),
                1 if real_k8s else 0,
                namespace,
                deployment_name,
                "pending",
            ),
        )
        conn.commit()
        return cursor.lastrowid


def get_investigation(investigation_id: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM investigations WHERE id = ?", (investigation_id,)
        ).fetchone()
    return dict(row) if row else None


def update_approval_status(investigation_id: int, status: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE investigations SET approval_status = ? WHERE id = ?",
            (status, investigation_id),
        )
        conn.commit()


def save_report(
    *,
    investigation_id: int,
    report_json: dict[str, Any],
    report_html: str,
    report_pdf: bytes | None = None,
) -> None:
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO reports (investigation_id, created_at, report_json, report_html, report_pdf)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(investigation_id) DO UPDATE SET
                created_at=excluded.created_at,
                report_json=excluded.report_json,
                report_html=excluded.report_html,
                report_pdf=excluded.report_pdf
            """,
            (
                investigation_id,
                datetime.now(timezone.utc).isoformat(),
                json.dumps(report_json),
                report_html,
                report_pdf,
            ),
        )
        conn.commit()


def get_report(investigation_id: int) -> dict[str, Any] | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT investigation_id, created_at, report_json, report_html, report_pdf FROM reports WHERE investigation_id = ?",
            (investigation_id,),
        ).fetchone()
    if not row:
        return None
    payload = dict(row)
    payload["report_json"] = json.loads(payload["report_json"])
    return payload


def get_recent_investigations(limit: int = 20) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM investigations ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def find_similar_past_incidents(root_cause: str, limit: int = 3) -> list[dict[str, Any]]:
    """Return past investigations whose root cause overlaps with the current one."""
    keywords = [w.lower() for w in root_cause.split() if len(w) > 4]
    if not keywords:
        return []
    with get_connection() as conn:
        results: list[dict[str, Any]] = []
        seen_ids: set[int] = set()
        for kw in keywords[:5]:
            rows = conn.execute(
                """
                SELECT * FROM investigations
                WHERE LOWER(root_cause) LIKE ?
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (f"%{kw}%", limit),
            ).fetchall()
            for row in rows:
                d = dict(row)
                if d["id"] not in seen_ids:
                    seen_ids.add(d["id"])
                    results.append(d)
        return results[:limit]


def get_stats() -> dict[str, Any]:
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM investigations").fetchone()[0]
        avg_conf = conn.execute(
            "SELECT AVG(confidence) FROM investigations"
        ).fetchone()[0]
        real_count = conn.execute(
            "SELECT COUNT(*) FROM investigations WHERE real_k8s = 1"
        ).fetchone()[0]
        approved_count = conn.execute(
            "SELECT COUNT(*) FROM investigations WHERE approval_status = 'approved'"
        ).fetchone()[0]
    return {
        "total_investigations": total,
        "real_k8s_investigations": real_count,
        "average_confidence": round(avg_conf or 0, 1),
        "approved_remediations": approved_count,
    }
