"""Tool registry for discovering and managing agent tools.

This registry is intentionally lightweight and extensible so future Kubernetes,
cloud, and Terraform tools can be added without changing the agent orchestration
surface.
"""

from __future__ import annotations

from typing import Any, Iterable

from app.tools.base import BaseTool


class ToolRegistry:
    """Register, unregister, and retrieve tool implementations by name."""

    def __init__(self, tools: Iterable[BaseTool] | None = None) -> None:
        self._tools: dict[str, BaseTool] = {}
        if tools is not None:
            for tool in tools:
                self.register(tool)

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance by its declared name."""
        name = self._normalize_name(tool.name)
        self._tools[name] = tool

    def unregister(self, name: str) -> None:
        """Remove a tool from the registry if it exists."""
        self._tools.pop(self._normalize_name(name), None)

    def get(self, name: str) -> BaseTool:
        """Return a registered tool by name."""
        normalized_name = self._normalize_name(name)
        try:
            return self._tools[normalized_name]
        except KeyError as exc:
            raise KeyError(f"Tool '{name}' is not registered.") from exc

    def list_tools(self) -> list[dict[str, str]]:
        """Return metadata for all registered tools."""
        return [
            {"name": tool.name, "description": tool.description}
            for tool in self._tools.values()
        ]

    def execute(self, tool_name: str, **kwargs: Any) -> Any:
        """Execute a registered tool by name."""
        return self.get(tool_name).execute(**kwargs)

    @staticmethod
    def _normalize_name(name: str) -> str:
        normalized = name.strip()
        if not normalized:
            raise ValueError("Tool name must not be empty.")
        return normalized
