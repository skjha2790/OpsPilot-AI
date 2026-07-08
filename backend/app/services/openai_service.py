from __future__ import annotations

import json
import time
from functools import lru_cache
from typing import Any

from openai import APIConnectionError, APITimeoutError, InternalServerError, OpenAI, RateLimitError
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.core.exceptions import OpsPilotError
from app.core.logging import get_logger
from app.schemas.investigation import InvestigationRequest, InvestigationResponse

logger = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are OpsPilot AI.\n\n"
    "You are an autonomous Kubernetes Incident Investigation Agent.\n\n"
    "You investigate production Kubernetes incidents.\n\n"
    "You explain probable root cause.\n\n"
    "You recommend safe remediation.\n\n"
    "Always respond using valid JSON matching the required response schema.\n"
    "Never return Markdown.\n"
    "Never return explanations outside JSON."
)


class OpenAIServiceError(OpsPilotError):
    pass


class OpenAIConfigurationError(OpenAIServiceError):
    pass


class OpenAITransientError(OpenAIServiceError):
    pass


class OpenAIService:
    def __init__(self, settings: Settings | None = None, client: OpenAI | None = None) -> None:
        self.settings = settings or get_settings()
        self.api_key = self.settings.openai_api_key
        self.model = (self.settings.openai_model or "gpt-5.4-mini").strip() or "gpt-5.4-mini"
        self.client = client or self._build_client()
        self.max_retries = 3
        self.base_retry_delay_seconds = 0.5

    def _build_client(self) -> OpenAI:
        if not self.api_key:
            raise OpenAIConfigurationError(
                "OPENAI_API_KEY is not configured.",
                status_code=503,
            )

        return OpenAI(api_key=self.api_key)

    def investigate_incident(self, request: InvestigationRequest) -> InvestigationResponse:
        from app.agents.investigation_agent import create_default_investigation_agent

        agent = create_default_investigation_agent(self)
        return agent.investigate(request)

    def generate_investigation_response(
        self,
        *,
        incident: str,
        system_prompt: str,
        user_prompt: str,
    ) -> InvestigationResponse:
        incident = incident.strip()
        if not incident:
            raise OpenAIConfigurationError(
                "Incident must not be empty.",
                status_code=422,
            )

        response_schema = InvestigationResponse.model_json_schema()

        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(
                    "openai_investigation_request_started",
                    extra={
                        "incident": incident,
                        "model": self.model,
                        "attempt": attempt,
                        "max_retries": self.max_retries,
                    },
                )

                response = self.client.responses.create(
                    model=self.model,
                    instructions=system_prompt,
                    input=user_prompt,
                    max_output_tokens=512,
                    text={
                        "format": {
                            "type": "json_schema",
                            "name": "incident_investigation_response",
                            "schema": response_schema,
                            "strict": True,
                        }
                    },
                )

                payload = self._parse_response(response.output_text)
                investigation = InvestigationResponse.model_validate(payload)

                logger.info(
                    "openai_investigation_request_succeeded",
                    extra={
                        "incident": incident,
                        "model": self.model,
                        "attempt": attempt,
                        "confidence": investigation.confidence,
                        # "severity": investigation.severity,
                    },
                )
                return investigation
            except ValidationError as exc:
                logger.warning(
                    "openai_investigation_validation_failed",
                    extra={
                        "incident": incident,
                        "model": self.model,
                        "attempt": attempt,
                        "error": exc.errors(),
                    },
                )
                raise OpenAIServiceError(
                    "OpenAI returned an invalid investigation payload.",
                    status_code=502,
                ) from exc
            except Exception as exc:  # noqa: BLE001
                if self._is_transient_error(exc) and attempt < self.max_retries:
                    delay = self.base_retry_delay_seconds * (2 ** (attempt - 1))
                    logger.warning(
                        "openai_investigation_request_retrying",
                        extra={
                            "incident": incident,
                            "model": self.model,
                            "attempt": attempt,
                            "delay_seconds": delay,
                            "error_type": exc.__class__.__name__,
                        },
                    )
                    time.sleep(delay)
                    continue

                logger.exception(
                    "openai_investigation_request_failed",
                    extra={
                        "incident": incident,
                        "model": self.model,
                        "attempt": attempt,
                        "error_type": exc.__class__.__name__,
                    },
                )
                raise self._normalize_exception(exc) from exc

        raise OpenAITransientError(
            "The investigation request could not be completed after retries.",
            status_code=503,
        )

    @staticmethod
    def _parse_response(response_text: str) -> dict[str, Any]:
        if not response_text.strip():
            raise OpenAIServiceError(
                "OpenAI returned an empty response.",
                status_code=502,
            )

        try:
            return json.loads(response_text)
        except json.JSONDecodeError as exc:
            raise OpenAIServiceError(
                "OpenAI returned invalid JSON.",
                status_code=502,
            ) from exc

    @staticmethod
    def _is_transient_error(exc: Exception) -> bool:
        return isinstance(
            exc,
            (
                APIConnectionError,
                APITimeoutError,
                InternalServerError,
                RateLimitError,
            ),
        ) or _status_code_is_transient(exc)

    @staticmethod
    def _normalize_exception(exc: Exception) -> OpenAIServiceError:
        if isinstance(exc, OpenAIServiceError):
            return exc

        if _status_code_is_transient(exc):
            return OpenAITransientError(
                "OpenAI service temporarily unavailable.",
                status_code=503,
            )

        message = str(exc) or "OpenAI request failed."
        return OpenAIServiceError(message, status_code=502)


def _status_code_is_transient(exc: Exception) -> bool:
    status_code = getattr(exc, "status_code", None)
    return isinstance(status_code, int) and status_code >= 500


@lru_cache
def get_openai_service() -> OpenAIService:
    return OpenAIService()
