---
name: run-hintly
description: Run, start, launch, build, and smoke-test the Hintly app locally (FastAPI tutor backend + TanStack/React frontend + MinIO S3). Use when asked to run the project, start the stack, screenshot the UI, or verify the backend<->S3 flow.
---

# Run Hintly locally

Hintly is a math-homework tutor: a **FastAPI backend** (`server/`) that owns the AI
(Gemini grades the photo + writes the tutor reply) and persists conversations +
homework images to **S3**, plus a **TanStack Start / React 19 + MUI frontend**
(`client/`). Locally, S3 is **MinIO in Docker**; the two apps run **natively** for
hot-reload and so the backend picks up the real `GEMINI_API_KEY` from `server/.env`.

The harness is two scripts in this skill dir, driven from the **repo root**
(all paths below are relative to the repo root):

- `.claude/skills/run-hintly/bootstrap.sh` — idempotent infra: starts MinIO, stops
  the conflicting compose app containers, creates the bucket, installs server deps.
- `.claude/skills/run-hintly/smoke.sh` — drives the running backend through a full
  create → persist → read round-trip and asserts the object landed in MinIO.

## Prerequisites

- **Docker Desktop** (for MinIO). `bootstrap.sh` launches it on macOS if down.
- **Node** (tested v26) — `client/node_modules` is already installed; `npm run dev` works.
- **Python venv at repo root** (`.venv/`, Python 3.12). If missing, create it:
  `python3 -m venv .venv`. `bootstrap.sh` installs `server/requirements.txt` into it.
- **`server/.env`** must exist with a real `GEMINI_API_KEY` and the **MinIO** S3 values
  (the committed `.env.example` ships placeholders — fix them once):

  ```
  S3_ENDPOINT_URL=http://localhost:9000
  S3_ACCESS_KEY=local-s3-access-key
  S3_SECRET_KEY=local-s3-secret-key
  S3_REGION=us-east-1
  S3_DEFAULT_BUCKET=math-tutor-assets
  ```

## Build / bootstrap

```bash
bash .claude/skills/run-hintly/bootstrap.sh
```

Brings up MinIO (`:9000` API, `:9001` console), stops the compose `fastapi-app`/`web`
containers if running (see Gotchas), creates the `math-tutor-assets` bucket, and
installs server deps into `.venv`. Safe to re-run.

## Run (agent path)

Start both apps in the background, then drive them:

```bash
# Backend — 127.0.0.1 (not 0.0.0.0) so it never collides with a compose container on IPv6.
# --env-file is REQUIRED: the AI code reads GEMINI_API_KEY from os.environ, which pydantic
# Settings does NOT populate. uvicorn --env-file loads .env into the process env.
( cd server && ../.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env >/tmp/uvicorn.log 2>&1 & )

# Frontend — Vite on :8080 (port is set in client/vite.config.ts). VITE_API_URL points the
# browser at the backend.
( cd client && VITE_API_URL=http://localhost:8000 npm run dev >/tmp/vite.log 2>&1 & )

# Wait for the backend, then run the round-trip harness.
for _ in $(seq 1 15); do curl -sf http://127.0.0.1:8000/ >/dev/null && break; sleep 1; done
bash .claude/skills/run-hintly/smoke.sh        # prints "SMOKE PASS"
```

Endpoints once up:

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:8080 |
| Backend (FastAPI) | http://localhost:8000 — docs at `/docs` |
| MinIO console | http://localhost:9001 (`local-s3-access-key` / `local-s3-secret-key`) |

**Drive the UI in a browser** (any chromium driver / Playwright MCP). Navigating to
`http://localhost:8080/` renders the Hintly login (screenshot: `hintly-home.png` in this
dir — a centered "Your ID" demo login, no password). A blank page means the backend or
Vite didn't come up — check `/tmp/vite.log` and `/tmp/uvicorn.log`.

Logout / stop everything:

```bash
pkill -f "uvicorn app.main:app"; pkill -f "vite dev"; docker compose stop s3-server
```

## Run (human path)

Same two commands without backgrounding (`uvicorn ... --reload`, `npm run dev`), each in
its own terminal. Hot-reload is on for both.

## Exercising the AI turn (optional)

The full tutor flow is `POST /students/{id}/conversations/{cid}/turn` (multipart:
`conversation_name`, `turn_number`, optional `student_text`, `images[]`). It calls Gemini,
so it needs a valid `GEMINI_API_KEY` and an image. `smoke.sh` deliberately does **not** hit
it (keeps the smoke key-free and fast); the create/list/persist path it does cover is what
proves the wiring. Existing `students/Tal/...` objects in MinIO are real prior turns.

## Gotchas (the non-obvious traps)

- **The repo's `docker-compose.yml` is a trap for native dev.** It defines `fastapi-app`
  (`:8000`) and `web` (`:8080`) with `restart: always`. If those containers are up, they
  **dual-stack listen on IPv6** while your native servers hold IPv4 on the same ports — and
  macOS resolves `localhost` to `::1` first, so requests silently hit the **container**
  backend instead of yours. That container has **no `GEMINI_API_KEY`** and writes to a
  **different bucket** (`hackaton-bucket`, set in the compose `environment:`), so you get
  AI failures and "my object isn't in S3" even though the API returns 200. `bootstrap.sh`
  stops them; `smoke.sh` and the backend bind `127.0.0.1` to be safe. Symptom to watch for:
  `curl localhost:8000/` reporting `"s3_default_bucket":"hackaton-bucket"` — that's the
  container answering, not you.
- **`GEMINI_API_KEY` is read from `os.environ`, not pydantic Settings.** Only the `s3_*`
  fields are in `app/config.py`. Run uvicorn with `--env-file .env` (or export the var) or
  every turn raises `RuntimeError: GEMINI_API_KEY is not set`.
- **`server/.env.example` has placeholder S3 creds** (`your-access-key`, empty endpoint).
  Pointed at AWS they'd fail; set them to the MinIO values above for local dev.
- **The `minio/mc` image has a minimal shell** — no `grep`/`awk`, and its entrypoint is `mc`.
  Drive it with `--entrypoint /bin/sh -c "mc alias set ...; mc ..."` using only `mc`
  subcommands (both scripts do this). It's run on the compose network so it can reach
  `s3-server:9000`; the network name is derived from the `local_s3` container, not hard-coded.
- **Frontend console shows a `favicon.ico` 404** — harmless, not a launch failure.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `curl :8000` shows `hackaton-bucket` / AI turns fail / object "missing" in MinIO | A compose container is stealing the port. `docker compose stop fastapi-app web`, restart native uvicorn on `127.0.0.1`. |
| `RuntimeError: GEMINI_API_KEY is not set` on a turn | Start uvicorn with `--env-file .env`; confirm the key is in `server/.env`. |
| `ModuleNotFoundError: uvicorn` | `.venv` lacks server deps — run `bootstrap.sh` (installs `server/requirements.txt`). |
| MinIO calls 403 / SignatureDoesNotMatch | `server/.env` still has placeholder S3 creds — set the MinIO values above. |
| `address already in use` on :8000/:8080 | Old native server still running: `pkill -f "uvicorn app.main:app"` / `pkill -f "vite dev"`. |
