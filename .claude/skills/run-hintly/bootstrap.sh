#!/usr/bin/env bash
# Bring up the local infra Hintly needs, idempotently:
#   - MinIO (local S3) via docker compose
#   - the S3 bucket the backend expects
#   - server Python deps into the repo-root .venv
#
# Run from the repo root:  bash .claude/skills/run-hintly/bootstrap.sh
# Safe to re-run. Does NOT start the app servers — see SKILL.md for that.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
VENV="$ROOT/.venv/bin"
BUCKET="math-tutor-assets"

echo "==> 1/4  Docker daemon"
if ! docker info >/dev/null 2>&1; then
  echo "    daemon down — launching Docker Desktop (macOS)…"
  open -a Docker 2>/dev/null || { echo "    !! start Docker manually"; exit 1; }
  for _ in $(seq 1 40); do docker info >/dev/null 2>&1 && break; sleep 3; done
  docker info >/dev/null 2>&1 || { echo "    !! Docker never came up"; exit 1; }
fi
echo "    daemon up"

echo "==> 2/4  MinIO (s3-server) — and stop the compose APP containers"
# The repo's docker-compose.yml also defines fastapi-app (:8000) and web (:8080)
# with `restart: always`. If they're up they fight the native servers for those
# ports (dual-stack: container grabs IPv6, native grabs IPv4) and silently steal
# requests — the container backend has no GEMINI_API_KEY and writes to a different
# bucket. We run ONLY MinIO in Docker; the app runs natively for hot-reload + the
# real Gemini key from server/.env. So: bring the app containers DOWN, MinIO UP.
docker compose stop fastapi-app web >/dev/null 2>&1 || true
docker compose up -d s3-server >/dev/null
for _ in $(seq 1 20); do
  curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1 && break; sleep 2
done
curl -sf http://localhost:9000/minio/health/live >/dev/null 2>&1 \
  && echo "    MinIO healthy on :9000 (console :9001)" \
  || { echo "    !! MinIO not healthy"; exit 1; }

echo "==> 3/4  Bucket '$BUCKET'"
# mc image's entrypoint is 'mc'; override it so we can chain commands.
# Talk to the broker over the compose network the container is actually on.
NET="$(docker inspect local_s3 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')"
docker run --rm --network "$NET" --entrypoint /bin/sh minio/mc:latest -c "
  mc alias set local http://s3-server:9000 local-s3-access-key local-s3-secret-key >/dev/null &&
  mc mb -p local/$BUCKET >/dev/null 2>&1 || true
  mc ls local" | sed 's/^/    /'

echo "==> 4/4  Server Python deps -> .venv"
[ -x "$VENV/python" ] || { echo "    !! $VENV/python missing — create the venv first"; exit 1; }
"$VENV/python" -m pip install -q -r server/requirements.txt
"$VENV/python" -c "import fastapi, uvicorn, aioboto3; from google import genai" \
  && echo "    deps OK"

echo
echo "Bootstrap done. Start the apps (see SKILL.md):"
echo "  Backend : (cd server && $VENV/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --env-file .env)"
echo "  Frontend: (cd client && VITE_API_URL=http://localhost:8000 npm run dev)"
