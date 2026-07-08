"""Abstract agent contracts for OpsPilot AI.

The agent layer coordinates tool usage and model reasoning without knowing
about any specific infrastructure backend. These contracts remain stable while
tools evolve from mock implementations to real integrations.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.investigation import InvestigationRequest, InvestigationResponse


class BaseAgent(ABC):
    """Common interface for agent implementations."""

    @abstractmethod
    def investigate(self, request: InvestigationRequest) -> InvestigationResponse:
        """Run the investigation workflow for the supplied request."""

