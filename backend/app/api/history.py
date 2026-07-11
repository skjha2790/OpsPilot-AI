"""Investigation history endpoints.

Serves persisted RCA data from SQLite so the frontend InvestigationHistory
panel shows real past investigations instead of browser localStorage only.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.db.database import get_recent_investigations, get_stats

router = APIRouter(prefix="/api/v1", tags=["History"])


@router.get("/investigations")
def list_investigations() -> list[dict]:
    """Return the 20 most recent investigations."""
    return get_recent_investigations(limit=20)


@router.get("/stats")
def investigation_stats() -> dict:
    """Return aggregate statistics for the platform snapshot panel."""
    return get_stats()
