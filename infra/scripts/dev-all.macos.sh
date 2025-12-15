#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "→ Starting Mongo (docker compose up -d)…"
npm run dev:mongo

echo "→ Opening services in 3 separate Terminal windows…"
osascript <<OSA
set rootPath to "$ROOT_DIR"

tell application "Terminal"
  activate

  set w1 to (do script "cd " & quoted form of rootPath & " && npm run dev:identity")
  set w2 to (do script "cd " & quoted form of rootPath & " && npm run dev:app-api")
  set w3 to (do script "cd " & quoted form of rootPath & " && npm run dev:expo")
end tell
OSA


echo "✅ dev:all started"
