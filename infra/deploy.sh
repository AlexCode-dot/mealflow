#!/usr/bin/env bash
# MealFlow — one-command redeploy on the Hetzner VPS.
#
# Pulls latest main, rebuilds the changed service images, and restarts the stack
# with zero config drift. Run from anywhere on the server:
#   /opt/mealflow/infra/deploy.sh
set -euo pipefail

REPO_DIR="${MEALFLOW_REPO_DIR:-/opt/mealflow}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

cd "$REPO_DIR/infra"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $REPO_DIR/infra/$ENV_FILE not found. Copy .env.prod.example and fill it in." >&2
  exit 1
fi

echo "==> Pulling latest main"
git -C "$REPO_DIR" pull --ff-only

echo "==> Building and restarting"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build

echo "==> Pruning dangling images"
docker image prune -f >/dev/null

echo "==> Status"
docker compose -f "$COMPOSE_FILE" ps

echo "==> Done. Tail logs with:"
echo "    docker compose -f $REPO_DIR/infra/$COMPOSE_FILE logs -f"
