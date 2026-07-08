from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.schemas.investigation import InvestigationRequest, InvestigationResponse
from app.services.openai_service import OpenAIService, get_openai_service

router = APIRouter(prefix="/api/v1", tags=["Investigations"])


@router.post(
    "/investigate",
    response_model=InvestigationResponse,
    summary="Investigate a Kubernetes incident with OpenAI",
)
async def investigate(
    request: InvestigationRequest,
    service: OpenAIService = Depends(get_openai_service),
) -> InvestigationResponse:
    return await run_in_threadpool(service.investigate_incident, request)
