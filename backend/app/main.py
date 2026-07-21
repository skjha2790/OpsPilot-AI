from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.history import router as history_router
from app.api.investigate import router as investigate_router
from app.api.remediation import router as remediation_router
from app.api.reports import router as reports_router
from app.api.stream import router as stream_router
from app.api.telemetry import router as telemetry_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger

settings = get_settings()
configure_logging(settings.log_level)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    from app.db.database import init_db

    init_db()
    logger.info(
        "backend_startup",
        extra={
            "app_name": settings.app_name,
            "app_version": settings.app_version,
            "environment": settings.environment,
        },
    )
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="OpsPilot AI — Autonomous Kubernetes Incident Investigation.",
        contact={"name": "OpsPilot AI"},
        license_info={"name": "MIT"},
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(investigate_router)
    app.include_router(stream_router)
    app.include_router(remediation_router)
    app.include_router(reports_router)
    app.include_router(history_router)
    app.include_router(telemetry_router)

    return app


app = create_app()
