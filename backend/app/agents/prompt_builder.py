"""Prompt construction helpers for the OpsPilot AI investigation agent.

These prompts are designed for the current hackathon foundation and will be
reused when additional tools are introduced later.
"""

from __future__ import annotations

import json
from typing import Any, Iterable

from pydantic import BaseModel, ConfigDict, Field


SYSTEM_PROMPT = (
    "You are OpsPilot AI.\n\n"
    "You are an Autonomous Kubernetes Incident Investigation Agent.\n\n"
    "You explain root cause.\n"
    "You use Kubernetes evidence.\n"
    "You return ONLY valid JSON.\n"
    "You never return Markdown."
)


class ToolContextItem(BaseModel):
    """Serializable representation of tool output included in the prompt."""

    tool_name: str = Field(description="Registered tool name.")
    operation: str = Field(description="Operation executed on the tool.")
    output: dict[str, Any] | list[Any] | str | int | float | bool | None = Field(
        description="JSON-serializable tool output."
    )

    model_config = ConfigDict(extra="forbid")


class PromptBundle(BaseModel):
    """System and user prompts returned by the prompt builder."""

    system_prompt: str
    user_prompt: str

    model_config = ConfigDict(extra="forbid")


class PromptBuilder:
    """Build prompt payloads for the investigation agent."""

    def build(
        self,
        *,
        incident: str,
        tool_outputs: Iterable[dict[str, Any]] | Iterable[ToolContextItem] | None = None,
    ) -> PromptBundle:
        context_items = self._normalize_tool_outputs(tool_outputs)
        user_payload = {
            "incident": incident,
            "kubernetes_evidence": [item.model_dump(mode="json") for item in context_items],
        }

        return PromptBundle(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=(
                "Investigate the incident using the following JSON context and "
                "return a single JSON object:\n"
                f"{json.dumps(user_payload, indent=2, ensure_ascii=False)}"
            ),
        )

    def _normalize_tool_outputs(
        self,
        tool_outputs: Iterable[dict[str, Any]] | Iterable[ToolContextItem] | None,
    ) -> list[ToolContextItem]:
        if tool_outputs is None:
            return []

        normalized: list[ToolContextItem] = []
        for item in tool_outputs:
            if isinstance(item, ToolContextItem):
                normalized.append(item)
                continue

            normalized.append(ToolContextItem.model_validate(item))

        return normalized

