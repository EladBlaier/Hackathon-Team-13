# Hintly — deploy guide

Two apps, deployed as **two separate Vercel projects** from this one repo.

```
client/   TanStack Start frontend (React 19 + MUI)
server/   FastAPI backend — owns the AI (Gemini grades the photo + writes the tutor reply)
```

The backend generates the tutoring feedback on each turn and persists conversations
+ homework images to S3. The frontend uploads photos/messages and renders the
backend's reply.

## 1. Backend (`server/`)

Create a Vercel project with **Root Directory = `server`**. Vercel runs
`api/index.py` (FastAPI) as a Python function; `vercel.json` routes every path to it.

Environment variables:

| Var | Notes |
|-----|-------|
| `GEMINI_API_KEY` | Google AI Studio key (https://aistudio.google.com/apikey) |
| `S3_ENDPOINT_URL` | **Empty** for AWS S3; set to the R2/MinIO S3 endpoint otherwise |
| `S3_ACCESS_KEY` | bucket access key |
| `S3_SECRET_KEY` | bucket secret key |
| `S3_REGION` | e.g. `us-east-1` |
| `S3_DEFAULT_BUCKET` | pre-created bucket name (e.g. `math-tutor-assets`) |

Pre-create the bucket. See `server/.env.example`. Local dev:
`cd server && uvicorn app.main:app --reload` (port 8000).

## 2. Frontend (`client/`)

Create a Vercel project with **Root Directory = `client`**. The build emits
`.vercel/output` (Nitro `vercel` preset, set in `vite.config.ts`).

Environment variables:

| Var | Notes |
|-----|-------|
| `VITE_API_URL` | the deployed **backend** project URL |
| `NITRO_PRESET` | `vercel` (already the default; only set to override) |

Local dev: `cd client && VITE_API_URL=http://localhost:8000 npm run dev`.

## Tests

- Backend: `cd server && python -m pytest tests -q` (no key/S3 needed — Gemini and
  S3 are mocked; covers the turn flow + prompt budget).
- Frontend: `cd client && npx tsc --noEmit && npm run lint && npm run build`.
