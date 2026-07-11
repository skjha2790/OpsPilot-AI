from pydantic import BaseModel, ConfigDict, Field


class InvestigationRequest(BaseModel):
    incident: str = Field(min_length=1, description="The incident type or symptom to investigate.")

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"example": {"incident": "CrashLoopBackOff in payment-service"}},
    )


class InvestigationResponse(BaseModel):
    summary: str = Field(description="Short investigation summary.")
    root_cause: str = Field(description="The most likely root cause.")
    confidence: int = Field(ge=0, le=100, description="Confidence score from 0 to 100.")
    evidence: list[str] = Field(description="Key evidence items supporting the diagnosis.")
    remediation: str = Field(description="Safe remediation guidance.")
    recovery_steps: list[str] = Field(description="Safe recovery steps to execute or review.")
    investigation_id: int | None = Field(
        default=None,
        description="SQLite row ID assigned after persistence. Used for the approval flow.",
    )
    tools_called: list[str] = Field(
        default_factory=list,
        description="Ordered list of Kubernetes tools the agent called.",
    )
    real_k8s: bool = Field(
        default=False,
        description="True when evidence was gathered from a live Kubernetes cluster.",
    )

    model_config = ConfigDict(extra="forbid")
