# OpsPilot AI Frontend

Production-style React dashboard for the OpsPilot AI hackathon MVP.

## Local Setup

```bash
cd frontend
npm install
npm run dev
```

The app runs on:

```text
http://localhost:5173
```

## Backend Connection

The frontend calls:

```text
POST /api/v1/investigate
```

By default Vite proxies `/api` requests to:

```text
http://127.0.0.1:8000
```

If you need a different backend target, create `frontend/.env`:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Build

```bash
npm run build
```

## Notes

- Dark enterprise dashboard with blue/cyan accents
- Responsive desktop-first layout
- Reusable layout and result components
- Loading timeline and retryable error handling

