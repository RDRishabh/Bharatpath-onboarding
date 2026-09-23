#!/usr/bin/env bash
# Start BOTH the API and the Celery worker + outbox relay against the local
# docker stack, as background processes, with shared cleanup on Ctrl-C.
#
# Why this exists: the resume parse flow needs two processes.
#   - API (uvicorn)        — serves the upload + status endpoints
#   - Worker (celery)      — picks up `resume.parse` / `scoring.score_resume` /
#                            `integrity.detect` tasks published by the outbox
#                            relay (also runs here, see dev_workers.sh)
#
# If only the API is running, uploads succeed but parsing never starts and the
# mobile app times out after 60s with "parsing has not started. The resume
# parser worker may not be running." This script makes that impossible to
# forget: one command starts everything local dev needs.
#
# Usage:
#   bash scripts/dev_all.sh              # both, API on :8099
#   bash scripts/dev_all.sh --reload     # pass --reload to the API only
#   PORT=8080 bash scripts/dev_all.sh    # custom API port
#
# Logs: /tmp/bp_api.log and /tmp/bp_workers.log (overwritten each run).
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8099}"
API_LOG="/tmp/bp_api.log"
WORKER_LOG="/tmp/bp_workers.log"

# Resolve a python binary the same way dev_api.sh / dev_workers.sh do.
if [ -n "${PYTHON:-}" ]; then
  PYTHON_BIN="$PYTHON"
elif [ -x .venv/bin/python ]; then
  PYTHON_BIN=.venv/bin/python
else
  PYTHON_BIN=python
fi

# Load .env once so both children share it.
set -a; [ -f .env ] && . ./.env; set +a

API_PID=""
WORKER_PID=""

cleanup() {
  echo ""
  echo "→ shutting down (api=$API_PID worker=$WORKER_PID)"
  [ -n "$WORKER_PID" ] && kill "$WORKER_PID" 2>/dev/null || true
  [ -n "$API_PID" ]    && kill "$API_PID"    2>/dev/null || true
  # Give them a moment, then force-kill anything still alive.
  sleep 1
  [ -n "$WORKER_PID" ] && kill -9 "$WORKER_PID" 2>/dev/null || true
  [ -n "$API_PID" ]    && kill -9 "$API_PID"    2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- Kill anything already on the API port (same reason as dev_api.sh) -----
if command -v lsof >/dev/null 2>&1; then
  for pid in $(lsof -t -i ":${PORT}" 2>/dev/null || true); do
    kill -9 "$pid" 2>/dev/null || true
  done
fi

# --- Start the worker + outbox relay ----------------------------------------
# dev_workers.sh runs the worker in the background itself and then blocks on
# the relay loop, so we can run the whole script in the background.
"$PYTHON_BIN" -m celery -A app.worker.celery_app worker \
  --loglevel=info \
  --pool=solo \
  > "$WORKER_LOG" 2>&1 &
WORKER_PID=$!

# --- Start the API ----------------------------------------------------------
# Pass through any args (e.g. --reload) to uvicorn only.
"$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" "$@" \
  > "$API_LOG" 2>&1 &
API_PID=$!

echo "BharatPath local dev started"
echo "  API    : http://localhost:${PORT}  (pid ${API_PID}, log ${API_LOG})"
echo "  Worker : celery solo + outbox relay (pid ${WORKER_PID}, log ${WORKER_LOG})"
echo ""
echo "Ctrl-C stops both. Tail logs with:"
echo "  tail -f ${API_LOG} ${WORKER_LOG}"
echo ""

# Wait for either child to exit. If one dies, cleanup kills the other.
wait -n "$API_PID" "$WORKER_PID"
EXIT_CODE=$?
echo "→ a child exited (api or worker); shutting down" >&2
exit "$EXIT_CODE"
