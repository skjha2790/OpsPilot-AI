from pydantic import BaseModel, ConfigDict, Field


class InvestigationRequest(BaseModel):
    incident: str = Field(min_length=1, description="The incident type or symptom to investigate.")

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "incident": "CrashLoopBackOff",
            }
        },
    )


class InvestigationResponse(BaseModel):
    summary: str = Field(description="Short investigation summary.")
    root_cause: str = Field(description="The most likely root cause.")
    confidence: int = Field(ge=0, le=100, description="Confidence score from 0 to 100.")
    evidence: list[str] = Field(description="Key evidence items supporting the diagnosis.")
    remediation: str = Field(description="Safe remediation guidance.")
    recovery_steps: list[str] = Field(description="Safe recovery steps to execute or review.")

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "summary": "Application startup failure causing repeated pod restarts.",
                "root_cause": "Container exits immediately due to failed application startup.",
                "confidence": 94,
                "evidence": [
                    "Container exits immediately after startup.",
                    "Repeated pod restarts are consistent with a startup failure.",
                ],
                "remediation": "Inspect container logs and verify application configuration.",
                "recovery_steps": [
                    "Review the failing container logs.",
                    "Check environment variables and startup command.",
                    "Restart the workload after fixing the configuration.",
                ],
            }
        },
    )
