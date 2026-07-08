"""Abstract interfaces for the OpsPilot AI tool framework.

These contracts define the shape of tools the agent can invoke. The current
implementation is intentionally framework-only and will later be backed by real
enterprise integrations such as the Kubernetes Python client.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar


class BaseTool(ABC):
    """Abstract base class for agent-executable tools."""

    name: ClassVar[str]
    description: ClassVar[str]

    @abstractmethod
    def execute(self, **kwargs: Any) -> Any:
        """Execute the tool and return a JSON-serializable result."""

