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

It now also includes the first AI capability:

- `POST /api/v1/investigate`
- OpenAI Responses API integration
- Pydantic request and response models
- Retry-aware service wrapper
- Structured logging around each investigation

This slice intentionally does not implement Kubernetes, database, or tool-calling logic.

## Requirements

- Python 3.12
- uv

## Local Setup

```bash
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

If `uv` is not available, use the existing virtual environment directly:

```powershell
.\.venv\Scripts\python.exe -m pip install openai
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
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

Investigation endpoint:

```text
POST /api/v1/investigate
Content-Type: application/json

{
  "incident": "CrashLoopBackOff"
}
```

Set the OpenAI variables in `backend/.env` before testing the investigation endpoint:

```text
OPENAI_API_KEY="your_api_key"
OPENAI_MODEL="your_model_name"
```

Example local test from PowerShell:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:8000/api/v1/investigate `
  -ContentType "application/json" `
  -Body '{"incident":"CrashLoopBackOff"}'
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
