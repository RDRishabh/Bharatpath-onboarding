#!/usr/bin/env bash
# Start the API against the local docker stack, replacing any previous run.
#
# The kill step is not boilerplate. On Windows `pkill -f uvicorn` does not
# reach the process, so a restart silently leaves the OLD build listening --
# and the symptom is a code change that appears to have no effect, which
# costs far more time than it should.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8099}"

if command -v lsof >/dev/null 2>&1; then
  for pid in $(lsof -t -i ":${PORT}" 2>/dev/null || true); do
    kill -9 "$pid" 2>/dev/null || true
  done
else
  for pid in $(netstat -ano 2>/dev/null | grep ":${PORT}.*LISTENING" | awk '{print $5}' | sort -u); do
    taskkill //F //PID "$pid" >/dev/null 2>&1 || kill -9 "$pid" 2>/dev/null || true
  done
fi

set -a; [ -f .env ] && . ./.env; set +a
exec "${PYTHON:-python}" -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT" "$@"
