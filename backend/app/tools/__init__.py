"""Tool package for the OpsPilot AI agent tool framework.

These tools are mock implementations for the hackathon foundation and will be
replaced later by real integrations such as the Kubernetes Python client.
"""

from app.tools.base import BaseTool
from app.tools.registry import ToolRegistry

__all__ = ["BaseTool", "ToolRegistry"]
