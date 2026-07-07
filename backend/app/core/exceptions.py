from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


class OpsPilotError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OpsPilotError)
    async def handle_opspilot_error(_: Request, exc: OpsPilotError) -> JSONResponse:
        logger.warning(
            "application_error",
            extra={"status_code": exc.status_code, "detail": exc.message},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "type": "application_error",
                    "message": exc.message,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        logger.warning("validation_error", extra={"errors": exc.errors()})
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "type": "validation_error",
                    "message": "Request validation failed.",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unexpected_error", extra={"error": str(exc)})
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "type": "internal_server_error",
                    "message": "An unexpected error occurred.",
                }
            },
        )
