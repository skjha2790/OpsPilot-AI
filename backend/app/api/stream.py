"""Server-Sent Events streaming endpoint for live investigation progress.

The frontend subscribes to this endpoint using the Fetch API with a ReadableStream
reader. Each SSE event drives one step in the agent workflow pipeline displayed
in the UI in real time.
"""

from __future__ import annotations

import json
import threading
from queue import Empty, Queue
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.db.database import find_similar_past_incidents, save_investigation
from app.schemas.investigation import InvestigationRequest
from app.services.openai_service import OpenAIService, get_openai_service

router = APIRouter(prefix="/api/v1", tags=["Stream"])

_SENTINEL = object()


def _infer_severity(incident: str) -> str:
    lowered = incident.lower()
    if any(k in lowered for k in ["node not ready", "nodenotready", "ingress", "503", "p0"]):
        return "P0"
    if any(k in lowered for k in ["crashloop", "imagepull", "secret", "auth", "payment"]):
        return "P1"
    return "P2"


@router.post("/investigate/stream")
async def investigate_stream(
    request: InvestigationRequest,
    service: OpenAIService = Depends(get_openai_service),
) -> StreamingResponse:
    """Stream investigation progress as Server-Sent Events.

    The frontend reads this stream using fetch + ReadableStream and drives
    the agent workflow pipeline UI and terminal panel in real time.

    The deployment name and namespace saved to the database come from what
    the agent actually discovered in the cluster — not from parsing the
    incident text — so the Approve remediation action targets the real
    affected workload.
    """
    queue: Queue[Any] = Queue()

    def run() -> None:
        try:
            from app.agents.investigation_agent import create_default_investigation_agent
            from app.services.agentic_loop import run_agentic_loop

            agent = create_default_investigation_agent(service)

            # Enrich the prompt with similar past incidents if any exist.
            past = find_similar_past_incidents(request.incident, limit=2)
            incident_with_context = request.incident
            if past:
                context_lines = [
                    f"- Past incident: {p['incident']} → Root cause: {p['root_cause']}"
                    for p in past
                ]
                incident_with_context = (
                    f"{request.incident}\n\n"
                    f"Similar past incidents for context:\n"
                    + "\n".join(context_lines)
                )

            # run_agentic_loop now returns 4 values:
            # result, tools_called, deployment_name, namespace
            # deployment_name comes from real tool output — the pod or deployment
            # the agent actually found in the cluster.
            result, tools_called, deployment_name, namespace = run_agentic_loop(
                incident=incident_with_context,
                registry=agent.tool_registry,
                openai_client=service.client,
                model=service.model,
                event_callback=queue.put,
            )

            # Fallback namespace if the agent only called get_nodes or similar
            # and never hit a namespaced resource.
            if not namespace:
                namespace = "default"

            investigation_id = save_investigation(
                incident=request.incident,
                severity=_infer_severity(request.incident),
                response=result,
                tools_called=tools_called,
                real_k8s=True,
                namespace=namespace,
                deployment_name=deployment_name,
            )

            # Emit the saved event so the frontend gets the investigation_id
            # and the real deployment_name for the Approve button.
            queue.put({
                "type": "saved",
                "investigation_id": investigation_id,
                "namespace": namespace,
                "deployment_name": deployment_name,
            })

        except Exception as exc:
            queue.put({"type": "error", "message": str(exc)})
        finally:
            queue.put(_SENTINEL)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()

    async def generate():
        import asyncio
        loop = asyncio.get_event_loop()
        while True:
            item = await loop.run_in_executor(None, _blocking_get, queue)
            if item is _SENTINEL:
                break
            yield f"data: {json.dumps(item, default=str)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


def _blocking_get(queue: Queue) -> Any:
    while True:
        try:
            return queue.get(timeout=0.1)
        except Empty:
            continue
