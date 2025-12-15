#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "→ Stopping Mongo containers…"
npm run dev:mongo:down || true

kill_port () {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"

  if [[ -n "$pids" ]]; then
    echo "→ Killing processes on port $port: $pids"
    kill -TERM $pids 2>/dev/null || true
    sleep 0.2
    # If anything is still alive, force kill
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "→ Forcing kill on port $port: $pids"
      kill -KILL $pids 2>/dev/null || true
    fi
  else
    echo "→ Port $port: nothing running"
  fi
}

# Spring services
kill_port 8081  # identity-service
kill_port 8082  # app-api

# Expo/Metro (your expo moved to 8083 because 8081 was taken)
kill_port 8083

# Optional: common Expo legacy ports (safe to include; it only kills if something listens there)
kill_port 19000
kill_port 19001
kill_port 19002

echo "✅ dev:all:down complete"
