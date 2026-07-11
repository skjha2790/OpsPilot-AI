"""Remediation execution endpoint.

When a P1 incident reaches the Decision Engine and the operator clicks Approve,
the frontend calls this endpoint to execute the remediation on the real cluster.
The backend verifies pod health after execution and records the outcome.
"""

from __future__ import annotations

import datetime
import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from app.core.logging import get_logger
from app.db.database import get_investigation, update_approval_status

router = APIRouter(prefix="/api/v1/remediation", tags=["Remediation"])
logger = get_logger(__name__)


class RemediationRequest(BaseModel):
    investigation_id: int
    action: str = "rollout_restart"

    model_config = ConfigDict(extra="forbid")


class RemediationResult(BaseModel):
    investigation_id: int
    action: str
    status: str
    namespace: str | None
    deployment_name: str | None
    verified_healthy: bool
    message: str
    executed_at: str

    model_config = ConfigDict(extra="forbid")


@router.post("/approve", response_model=RemediationResult)
def approve_remediation(request: RemediationRequest) -> RemediationResult:
    """Execute approved remediation for a P1 incident.

    Performs a rolling restart of the affected deployment and verifies
    pod health within 60 seconds. The outcome is persisted in the database.
    """
    investigation = get_investigation(request.investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found.")

    if investigation.get("approval_status") == "approved":
        raise HTTPException(status_code=409, detail="Remediation already executed.")

    namespace = investigation.get("namespace") or "default"
    deployment_name = investigation.get("deployment_name")

    if not deployment_name:
        # Attempt to extract from incident text as a last resort.
        deployment_name = _extract_deployment(investigation.get("incident", ""))

    executed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

    if not deployment_name:
        update_approval_status(request.investigation_id, "approved_no_target")
        return RemediationResult(
            investigation_id=request.investigation_id,
            action=request.action,
            status="skipped",
            namespace=namespace,
            deployment_name=None,
            verified_healthy=False,
            message="Deployment name could not be determined. Manual remediation required.",
            executed_at=executed_at,
        )

    try:
        _rollout_restart(namespace, deployment_name)
        logger.info(
            "remediation_rollout_restart_executed",
            extra={"namespace": namespace, "deployment": deployment_name},
        )
    except Exception as exc:
        logger.exception("remediation_execution_failed")
        update_approval_status(request.investigation_id, "failed")
        raise HTTPException(
            status_code=500,
            detail=f"Rollout restart failed: {exc}",
        ) from exc

    verified = _wait_for_healthy(namespace, deployment_name, timeout=60)
    status = "approved" if verified else "approved_unverified"
    update_approval_status(request.investigation_id, status)

    logger.info(
        "remediation_completed",
        extra={
            "namespace": namespace,
            "deployment": deployment_name,
            "verified": verified,
        },
    )
    return RemediationResult(
        investigation_id=request.investigation_id,
        action=request.action,
        status=status,
        namespace=namespace,
        deployment_name=deployment_name,
        verified_healthy=verified,
        message=(
            f"Rollout restart executed for {deployment_name} in {namespace}. "
            + ("Pods verified healthy." if verified else "Pods not yet healthy — monitor manually.")
        ),
        executed_at=executed_at,
    )


@router.post("/reject")
def reject_remediation(request: RemediationRequest) -> dict[str, Any]:
    """Record that the operator rejected the proposed remediation."""
    investigation = get_investigation(request.investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found.")
    update_approval_status(request.investigation_id, "rejected")
    logger.info("remediation_rejected", extra={"investigation_id": request.investigation_id})
    return {"status": "rejected", "investigation_id": request.investigation_id}


def _rollout_restart(namespace: str, deployment_name: str) -> None:
    """Trigger a rolling restart by patching the restart annotation."""
    from kubernetes import client as k8s_client
    from kubernetes import config

    try:
        config.load_incluster_config()
    except Exception:
        config.load_kube_config()

    apps_v1 = k8s_client.AppsV1Api()
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    apps_v1.patch_namespaced_deployment(
        name=deployment_name,
        namespace=namespace,
        body={
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt": now,
                        }
                    }
                }
            }
        },
    )


def _wait_for_healthy(namespace: str, deployment_name: str, timeout: int = 60) -> bool:
    """Poll until the deployment's ready replicas match desired, or timeout."""
    from kubernetes import client as k8s_client
    from kubernetes import config

    try:
        config.load_incluster_config()
    except Exception:
        config.load_kube_config()

    apps_v1 = k8s_client.AppsV1Api()
    deadline = time.time() + timeout

    while time.time() < deadline:
        try:
            dep = apps_v1.read_namespaced_deployment(
                name=deployment_name, namespace=namespace
            )
            desired = dep.spec.replicas or 1
            ready = dep.status.ready_replicas or 0
            if ready >= desired:
                return True
        except Exception:
            pass
        time.sleep(3)

    return False


def _extract_deployment(incident: str) -> str | None:
    import re
    match = re.search(r"(?:deployment|deploy)[/ ]([a-z0-9-]+)", incident.lower())
    if match:
        return match.group(1)
    for word in incident.split():
        word = word.strip(".,;:")
        if any(suffix in word for suffix in ["-service", "-api", "-worker", "-app"]):
            return word
    return None
