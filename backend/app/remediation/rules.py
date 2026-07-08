"""Rule definitions for the advisory remediation engine.

The rules in this module are intentionally simple and deterministic. They
provide a stable foundation for future execution logic without connecting to a
real Kubernetes cluster.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.remediation.models import RiskLevel


class RemediationTemplate(BaseModel):
    """Template used to convert a rule match into a remediation action."""

    title: str
    description: str
    reason: str
    confidence: int
    risk_level: RiskLevel
    estimated_duration: str
    kubectl_command: str
    rollback_command: str
    category: str

    model_config = ConfigDict(extra="forbid")


class RemediationRule(BaseModel):
    """Keyword-based remediation rule definition."""

    name: str
    keywords: list[str] = Field(default_factory=list)
    templates: list[RemediationTemplate] = Field(default_factory=list)

    model_config = ConfigDict(extra="forbid")

    def matches(self, text: str) -> bool:
        """Return ``True`` when any keyword appears in the provided text."""
        lowered = text.lower()
        return any(keyword.lower() in lowered for keyword in self.keywords)


def build_rule_context(investigation: Any, evidence: dict[str, Any]) -> str:
    """Create a searchable text context from investigation output and evidence."""
    parts = [
        evidence.get("incident", ""),
        getattr(investigation, "summary", ""),
        getattr(investigation, "root_cause", ""),
        " ".join(getattr(investigation, "evidence", []) or []),
    ]
    selected_tools = evidence.get("selected_tools", [])
    if isinstance(selected_tools, list):
        parts.append(" ".join(str(tool) for tool in selected_tools))

    parts.append(str(evidence.get("tool_results", evidence)))
    return " ".join(part for part in parts if part).lower()


RULES: list[RemediationRule] = [
    RemediationRule(
        name="CrashLoopBackOff",
        keywords=["crashloopbackoff"],
        templates=[
            RemediationTemplate(
                title="Restart the workload safely",
                description="Trigger a rolling restart of the deployment to recover the crashing pods.",
                reason="CrashLoopBackOff usually indicates the workload needs a clean restart after fixing the underlying issue.",
                confidence=91,
                risk_level=RiskLevel.Medium,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl rollout restart deployment/<deployment-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="workload-recovery",
            ),
            RemediationTemplate(
                title="Remove the failing pod",
                description="Delete the repeatedly failing pod so the controller recreates it.",
                reason="A fresh pod can confirm whether the failure is tied to the current pod instance or its startup path.",
                confidence=84,
                risk_level=RiskLevel.Medium,
                estimated_duration="2-5 minutes",
                kubectl_command="kubectl delete pod <pod-name>",
                rollback_command="kubectl get pod <pod-name> -o yaml",
                category="pod-recovery",
            ),
            RemediationTemplate(
                title="Review application logs",
                description="Inspect the container logs and startup configuration for the root failure signal.",
                reason="Logs often expose configuration issues, missing environment variables, or dependency failures.",
                confidence=96,
                risk_level=RiskLevel.Low,
                estimated_duration="5-15 minutes",
                kubectl_command="kubectl logs <pod-name> --previous",
                rollback_command="kubectl logs <pod-name>",
                category="diagnostics",
            ),
            RemediationTemplate(
                title="Tune readiness timing",
                description="Increase the readiness probe timeout if the application needs more startup time.",
                reason="Slow boot times can cause premature restarts and repeated unready states.",
                confidence=72,
                risk_level=RiskLevel.Medium,
                estimated_duration="10-20 minutes",
                kubectl_command="kubectl edit deployment <deployment-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="configuration",
            ),
        ],
    ),
    RemediationRule(
        name="ImagePullBackOff",
        keywords=["imagepullbackoff", "errimagepull", "image pull"],
        templates=[
            RemediationTemplate(
                title="Verify the image reference",
                description="Confirm the image tag, repository path, and digest are valid.",
                reason="Pull failures often stem from a bad image reference or non-existent tag.",
                confidence=94,
                risk_level=RiskLevel.Low,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl describe pod <pod-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="image-validation",
            ),
            RemediationTemplate(
                title="Check imagePullSecret",
                description="Ensure the namespace has a valid registry credential secret attached.",
                reason="Private registries require credentials that may be missing or expired.",
                confidence=90,
                risk_level=RiskLevel.Medium,
                estimated_duration="10-15 minutes",
                kubectl_command="kubectl get secret -n <namespace>",
                rollback_command="kubectl delete secret <image-pull-secret>",
                category="credentials",
            ),
            RemediationTemplate(
                title="Verify registry connectivity",
                description="Confirm the cluster can reach the container registry endpoint.",
                reason="Network or registry availability issues can prevent image pulls from succeeding.",
                confidence=82,
                risk_level=RiskLevel.Medium,
                estimated_duration="10-20 minutes",
                kubectl_command="kubectl exec -it <debug-pod> -- curl -I <registry-host>",
                rollback_command="kubectl delete pod <debug-pod>",
                category="networking",
            ),
        ],
    ),
    RemediationRule(
        name="Pending",
        keywords=["pending", "unschedulable"],
        templates=[
            RemediationTemplate(
                title="Inspect node resources",
                description="Check whether CPU, memory, or taints are preventing scheduling.",
                reason="Pods commonly remain Pending when the cluster cannot satisfy resource or placement constraints.",
                confidence=88,
                risk_level=RiskLevel.Low,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl describe pod <pod-name>",
                rollback_command="kubectl delete pod <pod-name>",
                category="scheduling",
            ),
            RemediationTemplate(
                title="Review scheduler events",
                description="Inspect scheduler messages for placement blockers and node affinity conflicts.",
                reason="Scheduler events reveal the immediate reason a pod cannot be bound to a node.",
                confidence=84,
                risk_level=RiskLevel.Low,
                estimated_duration="5-15 minutes",
                kubectl_command="kubectl get events --sort-by=.metadata.creationTimestamp",
                rollback_command="kubectl delete pod <pod-name>",
                category="diagnostics",
            ),
            RemediationTemplate(
                title="Scale cluster capacity",
                description="Add capacity or free resources so the pod can be scheduled.",
                reason="Insufficient cluster capacity is a common cause of prolonged Pending states.",
                confidence=76,
                risk_level=RiskLevel.Medium,
                estimated_duration="15-30 minutes",
                kubectl_command="kubectl scale deployment <node-pool-or-capacity-manager>",
                rollback_command="kubectl scale deployment <node-pool-or-capacity-manager> --replicas=<previous>",
                category="capacity",
            ),
        ],
    ),
    RemediationRule(
        name="OOMKilled",
        keywords=["oomkilled", "out of memory"],
        templates=[
            RemediationTemplate(
                title="Increase memory limit",
                description="Raise the pod memory limit to match the workload's real usage profile.",
                reason="OOMKilled indicates the container exceeded its memory allocation.",
                confidence=92,
                risk_level=RiskLevel.Medium,
                estimated_duration="10-15 minutes",
                kubectl_command="kubectl edit deployment <deployment-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="resource-tuning",
            ),
            RemediationTemplate(
                title="Review memory requests",
                description="Confirm the request and limit values align with actual usage patterns.",
                reason="Poor request sizing can create unstable scheduling and runtime pressure.",
                confidence=87,
                risk_level=RiskLevel.Low,
                estimated_duration="10-20 minutes",
                kubectl_command="kubectl top pod <pod-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="resource-observability",
            ),
            RemediationTemplate(
                title="Restart the deployment",
                description="Roll the deployment to refresh the crashing pods after tuning resources.",
                reason="A controlled restart can validate that the resource changes have stabilized the workload.",
                confidence=78,
                risk_level=RiskLevel.Medium,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl rollout restart deployment/<deployment-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="workload-recovery",
            ),
        ],
    ),
    RemediationRule(
        name="NodeNotReady",
        keywords=["nodenotready", "node not ready", "notready"],
        templates=[
            RemediationTemplate(
                title="Cordon the unhealthy node",
                description="Prevent new workloads from scheduling onto the unavailable node.",
                reason="Cordon isolates the impact of the unhealthy node while recovery work continues.",
                confidence=90,
                risk_level=RiskLevel.Medium,
                estimated_duration="2-5 minutes",
                kubectl_command="kubectl cordon <node-name>",
                rollback_command="kubectl uncordon <node-name>",
                category="node-isolation",
            ),
            RemediationTemplate(
                title="Drain the node safely",
                description="Evict workloads from the node once it is isolated and safe to drain.",
                reason="Draining shifts traffic away from a failing node and reduces service disruption.",
                confidence=83,
                risk_level=RiskLevel.High,
                estimated_duration="10-20 minutes",
                kubectl_command="kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data",
                rollback_command="kubectl uncordon <node-name>",
                category="node-recovery",
            ),
            RemediationTemplate(
                title="Investigate kubelet health",
                description="Review kubelet and node-level logs for heartbeat or runtime failures.",
                reason="Node readiness failures frequently originate from kubelet or runtime instability.",
                confidence=86,
                risk_level=RiskLevel.Medium,
                estimated_duration="15-30 minutes",
                kubectl_command="kubectl describe node <node-name>",
                rollback_command="kubectl uncordon <node-name>",
                category="node-diagnostics",
            ),
        ],
    ),
    RemediationRule(
        name="DeploymentFailure",
        keywords=["deployment failure", "replicaset", "rollout failed"],
        templates=[
            RemediationTemplate(
                title="Rollback the deployment",
                description="Return the workload to the last known good revision.",
                reason="Rollback is the safest recovery path when a rollout introduces instability.",
                confidence=95,
                risk_level=RiskLevel.High,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl rollout undo deployment/<deployment-name>",
                rollback_command="kubectl rollout restart deployment/<deployment-name>",
                category="release-management",
            ),
            RemediationTemplate(
                title="Restart the deployment",
                description="Recreate the pods after confirming the bad revision is not being served.",
                reason="A clean restart can help recover from a transient rollout condition.",
                confidence=82,
                risk_level=RiskLevel.Medium,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl rollout restart deployment/<deployment-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="workload-recovery",
            ),
            RemediationTemplate(
                title="Verify ReplicaSet state",
                description="Inspect the active ReplicaSet to confirm the desired replicas are being created.",
                reason="ReplicaSet drift or failed pod templates can block a deployment from completing.",
                confidence=80,
                risk_level=RiskLevel.Low,
                estimated_duration="10-15 minutes",
                kubectl_command="kubectl get rs",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="diagnostics",
            ),
        ],
    ),
    RemediationRule(
        name="ServiceUnavailable",
        keywords=["service unavailable", "service unavail", "endpoints", "selector mismatch"],
        templates=[
            RemediationTemplate(
                title="Verify service endpoints",
                description="Confirm the Service resolves to healthy backing pods.",
                reason="Missing or empty endpoints can make the service appear unavailable even when pods are running.",
                confidence=89,
                risk_level=RiskLevel.Low,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl get endpoints <service-name>",
                rollback_command="kubectl rollout restart deployment/<deployment-name>",
                category="service-routing",
            ),
            RemediationTemplate(
                title="Restart the deployment",
                description="Roll the deployment after validating selector and endpoint wiring.",
                reason="A fresh rollout can restore service connectivity after configuration drift is corrected.",
                confidence=74,
                risk_level=RiskLevel.Medium,
                estimated_duration="5-10 minutes",
                kubectl_command="kubectl rollout restart deployment/<deployment-name>",
                rollback_command="kubectl rollout undo deployment/<deployment-name>",
                category="workload-recovery",
            ),
            RemediationTemplate(
                title="Check Service selector",
                description="Ensure the selector matches the intended pod labels and namespaces.",
                reason="Selector mismatches are a common cause of empty endpoints and failed traffic routing.",
                confidence=86,
                risk_level=RiskLevel.Low,
                estimated_duration="10-15 minutes",
                kubectl_command="kubectl describe service <service-name>",
                rollback_command="kubectl patch service <service-name>",
                category="configuration",
            ),
        ],
    ),
]

GENERIC_TEMPLATES: list[RemediationTemplate] = [
    RemediationTemplate(
        title="Continue investigation",
        description="Review the available Kubernetes evidence and validate the incident assumptions before changing anything.",
        reason="When no rule matches, the safest recommendation is to gather more evidence and avoid speculative changes.",
        confidence=65,
        risk_level=RiskLevel.Low,
        estimated_duration="10-20 minutes",
        kubectl_command="kubectl get pods -A",
        rollback_command="kubectl get events --sort-by=.metadata.creationTimestamp",
        category="diagnostics",
    ),
]
