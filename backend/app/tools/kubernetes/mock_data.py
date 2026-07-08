"""Mock Kubernetes pod data for the OpsPilot AI tool framework.

The data in this module is intentionally synthetic and JSON serializable. It
serves as a stable foundation for future replacement with Kubernetes API calls.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MockPodRecord(BaseModel):
    """Serializable mock representation of a Kubernetes Pod."""

    name: str = Field(description="Pod name.")
    namespace: str = Field(description="Pod namespace.")
    status: str = Field(description="Pod status or waiting reason.")
    node: str = Field(description="Node name where the pod is scheduled.")
    restart_count: int = Field(ge=0, description="Number of restarts observed.")
    age: str = Field(description="Human-readable pod age.")
    ready: str = Field(description="Readiness summary such as 1/1 or 0/1.")
    reason: str | None = Field(default=None, description="Optional status reason.")
    containers: list[str] = Field(description="Container names associated with the pod.")

    model_config = ConfigDict(extra="forbid")


class MockPodDetail(BaseModel):
    """Serializable mock representation of detailed pod inspection data."""

    name: str = Field(description="Pod name.")
    namespace: str = Field(description="Pod namespace.")
    status: str = Field(description="Pod status or waiting reason.")
    node: str = Field(description="Node name where the pod is scheduled.")
    restart_count: int = Field(ge=0, description="Number of restarts observed.")
    age: str = Field(description="Human-readable pod age.")
    ready: str = Field(description="Readiness summary such as 1/1 or 0/1.")
    reason: str | None = Field(default=None, description="Optional status reason.")
    containers: list[str] = Field(description="Container names associated with the pod.")
    events: list[str] = Field(description="Relevant synthetic pod events.")
    logs: list[str] = Field(description="Representative synthetic pod logs.")

    model_config = ConfigDict(extra="forbid")


MOCK_PODS: list[MockPodRecord] = [
    MockPodRecord(
        name="payments-api-7c9f8d7f8d-2qk8x",
        namespace="production",
        status="Running",
        node="kind-worker",
        restart_count=0,
        age="3d4h",
        ready="1/1",
        reason=None,
        containers=["payments-api"],
    ),
    MockPodRecord(
        name="orders-worker-6d4f6c9f7d-gp4nm",
        namespace="production",
        status="Pending",
        node="NotScheduled",
        restart_count=0,
        age="18m",
        ready="0/1",
        reason="Unschedulable",
        containers=["orders-worker"],
    ),
    MockPodRecord(
        name="checkout-api-54dcbf8c9f-9w8q2",
        namespace="production",
        status="CrashLoopBackOff",
        node="kind-worker",
        restart_count=7,
        age="41m",
        ready="0/1",
        reason="CrashLoopBackOff",
        containers=["checkout-api"],
    ),
    MockPodRecord(
        name="catalog-api-5b6f7f8d7c-krp22",
        namespace="production",
        status="ImagePullBackOff",
        node="kind-worker",
        restart_count=1,
        age="27m",
        ready="0/1",
        reason="ImagePullBackOff",
        containers=["catalog-api"],
    ),
    MockPodRecord(
        name="billing-worker-9d8b7c6f5f-xx4pm",
        namespace="production",
        status="OOMKilled",
        node="kind-worker",
        restart_count=4,
        age="2h12m",
        ready="0/1",
        reason="OOMKilled",
        containers=["billing-worker"],
    ),
    MockPodRecord(
        name="reporting-job-84cc9d7b55-hj2lm",
        namespace="batch",
        status="Completed",
        node="kind-worker",
        restart_count=0,
        age="6h3m",
        ready="0/1",
        reason="Completed",
        containers=["reporting-job"],
    ),
    MockPodRecord(
        name="inventory-cache-77d889b4f6-tz9hd",
        namespace="production",
        status="Unknown",
        node="kind-worker",
        restart_count=2,
        age="55m",
        ready="0/1",
        reason="NodeLost",
        containers=["inventory-cache"],
    ),
]

MOCK_POD_DETAILS: dict[str, MockPodDetail] = {
    "checkout-api-54dcbf8c9f-9w8q2": MockPodDetail(
        name="checkout-api-54dcbf8c9f-9w8q2",
        namespace="production",
        status="CrashLoopBackOff",
        node="kind-worker",
        restart_count=7,
        age="41m",
        ready="0/1",
        reason="CrashLoopBackOff",
        containers=["checkout-api"],
        events=[
            "Back-off restarting failed container checkout-api.",
            "Liveness probe failed repeatedly after container start.",
        ],
        logs=[
            "Error: missing REQUIRED_PAYMENT_GATEWAY_URL",
            "Application terminated during bootstrap.",
        ],
    ),
    "catalog-api-5b6f7f8d7c-krp22": MockPodDetail(
        name="catalog-api-5b6f7f8d7c-krp22",
        namespace="production",
        status="ImagePullBackOff",
        node="kind-worker",
        restart_count=1,
        age="27m",
        ready="0/1",
        reason="ImagePullBackOff",
        containers=["catalog-api"],
        events=[
            "Failed to pull image registry.example.com/catalog-api:1.4.2.",
            "Image pull secret not found in namespace production.",
        ],
        logs=[
            "ErrImagePull: unauthorized: access to the requested resource is denied",
            "Back-off pulling image registry.example.com/catalog-api:1.4.2",
        ],
    ),
}

