#!/usr/bin/env bash
# Run on the VPS inside the repo directory (or from anywhere if REPO_ROOT is set).
# Usage:
#   chmod +x scripts/vps-deploy.sh
#   ./scripts/vps-deploy.sh
#
# Does: git pull -> docker compose up -d --build
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found. Copy .env.example to .env and set TELEGRAM_* and other vars."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is not installed."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed."
  exit 1
fi

echo "==> git pull"
git pull

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> docker compose ps"
docker compose ps

echo "==> Done. Health: curl -sS http://127.0.0.1:${PORT:-8080}/health"
