#!/usr/bin/env bash
# Drive the running backend through a full create -> persist -> read round-trip
# and assert the object actually landed in MinIO. This is the harness: it proves
# the FastAPI <-> S3 wiring end-to-end, not just that a port is listening.
#
# Assumes bootstrap.sh ran and the backend is up on :8000.
#   bash .claude/skills/run-hintly/smoke.sh
set -euo pipefail
# IPv4 explicitly: on macOS `localhost` resolves to ::1 first, and a stray
# docker-compose fastapi-app container (IPv6 :8000) would steal the request.
API="${API:-http://127.0.0.1:8000}"
STUDENT="smoke-$$"
BUCKET="math-tutor-assets"

fail() { echo "SMOKE FAIL: $1" >&2; exit 1; }

echo "==> backend root"
curl -sf "$API/" >/dev/null || fail "backend not reachable at $API"

echo "==> create conversation (writes meta.json to S3)"
CREATE=$(curl -sf -X POST "$API/students/$STUDENT/conversations" \
  -H 'Content-Type: application/json' -d '{"name":"Smoke Test"}') || fail "create returned non-2xx"
CID=$(printf '%s' "$CREATE" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
[ -n "$CID" ] || fail "no conversation id in response: $CREATE"
echo "    conversation id=$CID"

echo "==> list conversations (reads back from S3)"
curl -sf "$API/students/$STUDENT/conversations" | grep -q "$CID" \
  || fail "created conversation not in list"

echo "==> verify object exists in MinIO"
NET="$(docker inspect local_s3 --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}')"
KEY="students/$STUDENT/conversations/$CID/meta.json"
docker run --rm --network "$NET" --entrypoint /bin/sh minio/mc:latest -c "
  mc alias set local http://s3-server:9000 local-s3-access-key local-s3-secret-key >/dev/null &&
  mc stat local/$BUCKET/$KEY" >/dev/null 2>&1 \
  || fail "object $KEY missing in MinIO"
echo "    $KEY present"

echo "SMOKE PASS"
