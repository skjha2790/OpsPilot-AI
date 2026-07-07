# OpsPilot AI Backend

FastAPI backend foundation for the OpsPilot AI OpenAI Agentic AI Hackathon MVP.

This backend currently provides only the BE-001 foundation:

- FastAPI application setup
- `/health` endpoint
- Pydantic Settings configuration
- Structured JSON logging
- Central exception handling
- CORS middleware
- OpenAPI metadata
- Dockerfile
- `uv` project metadata

This slice intentionally does not implement OpenAI, Kubernetes, database, or agent logic.

## Requirements

- Python 3.12
- uv

## Local Setup

```bash
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

The API will be available at:

```text
http://localhost:8000
```

OpenAPI docs:

```text
http://localhost:8000/docs
```

Health check:

```text
GET /health
```

## Docker

Build the backend image:

```bash
docker build -t opspilot-ai-backend .
```

Run the backend container:

```bash
docker run --rm -p 8000:8000 --env-file .env opspilot-ai-backend
```

## Project Structure

```text
backend/
├─ app/
│  ├─ api/
│  ├─ core/
│  ├─ models/
│  ├─ services/
│  ├─ schemas/
│  ├─ agents/
│  ├─ tools/
│  ├─ database/
│  ├─ utils/
│  └─ main.py
├─ .env.example
├─ Dockerfile
├─ pyproject.toml
└─ README.md
```
