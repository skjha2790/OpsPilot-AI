from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "ok",
                "service": "OpsPilot AI Backend",
                "version": "0.1.0",
                "environment": "development",
            }
        }
    )
