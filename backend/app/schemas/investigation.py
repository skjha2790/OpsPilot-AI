from typing import Literal

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
    incident: str = Field(description="The incident type that was investigated.")
    severity: Literal["Low", "Medium", "High", "Critical"] = Field(
        description="The assessed incident severity."
    )
    root_cause: str = Field(description="The most likely root cause.")
    confidence: int = Field(ge=0, le=100, description="Confidence score from 0 to 100.")
    recommendation: str = Field(description="Safe remediation guidance.")
    summary: str = Field(description="Short investigation summary.")

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "incident": "CrashLoopBackOff",
                "severity": "High",
                "root_cause": "Container exits immediately due to failed application startup.",
                "confidence": 94,
                "recommendation": "Inspect container logs and verify application configuration.",
                "summary": "Application startup failure causing repeated pod restarts.",
            }
        },
    )
