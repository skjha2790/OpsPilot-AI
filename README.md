# OpsPilot AI

Autonomous Kubernetes Production Recovery Agent powered by OpenAI.

## Local Backend Test

1. Go to `backend/`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `backend/.env`.
4. Start the backend with `uv run uvicorn app.main:app --reload`.
5. Call `POST /api/v1/investigate` with a body like:

```json
{
  "incident": "CrashLoopBackOff"
}
```
