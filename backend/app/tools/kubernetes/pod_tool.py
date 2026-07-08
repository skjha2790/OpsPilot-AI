"""Mock Kubernetes pod tool for the OpsPilot AI agent tool framework.

This tool returns JSON-serializable mock data today and is designed to be
replaced later by the Kubernetes Python Client without changing the registry or
agent orchestration contracts.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.tools.base import BaseTool
from app.tools.kubernetes.mock_data import MOCK_POD_DETAILS, MOCK_PODS, MockPodDetail, MockPodRecord


class PodListResponse(BaseModel):
    """Serializable pod list response for mock tool output."""

    operation: str = Field(default="get_pods")
    namespace: str | None = Field(default=None)
    pods: list[MockPodRecord]

    model_config = ConfigDict(extra="forbid")


class PodDetailResponse(BaseModel):
    """Serializable pod detail response for mock tool output."""

    operation: str = Field(default="describe_pod")
    name: str
    pod: MockPodDetail

    model_config = ConfigDict(extra="forbid")


class PodTool(BaseTool):
    """Mock Kubernetes pod inspection tool.

    The tool currently returns synthetic pod inventory and inspection details.
    It is intentionally isolated so the implementation can later be swapped for
    the Kubernetes Python Client without changing the surrounding agent code.
    """

    name = "kubernetes.pod"
    description = "Inspect mock Kubernetes pod inventory and pod details."

    def execute(self, **kwargs: Any) -> dict[str, Any]:
        operation = kwargs.get("operation")
        if operation == "get_pods":
            return self.get_pods(namespace=kwargs.get("namespace"))
        if operation == "describe_pod":
            name = kwargs.get("name")
            if not isinstance(name, str) or not name.strip():
                raise ValueError("describe_pod requires a non-empty 'name'.")
            return self.describe_pod(name=name)

        raise ValueError("Unsupported operation. Use 'get_pods' or 'describe_pod'.")

    def get_pods(self, namespace: str | None = None) -> dict[str, Any]:
        """Return a JSON-serializable list of mock pods."""
        pods = [
            pod
            for pod in MOCK_PODS
            if namespace is None or pod.namespace == namespace
        ]
        response = PodListResponse(namespace=namespace, pods=pods)
        return response.model_dump(mode="json")

    def describe_pod(self, name: str) -> dict[str, Any]:
        """Return a JSON-serializable mock pod detail payload."""
        pod = MOCK_POD_DETAILS.get(name)
        if pod is None:
            pod = MockPodDetail(
                name=name,
                namespace="production",
                status="Unknown",
                node="kind-worker",
                restart_count=0,
                age="unknown",
                ready="0/1",
                reason="NotFound",
                containers=[name.rsplit("-", 1)[0] if "-" in name else name],
                events=["Pod not found in mock data set."],
                logs=[],
            )

        response = PodDetailResponse(name=name, pod=pod)
        return response.model_dump(mode="json")

