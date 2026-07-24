#!/usr/bin/env bash
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$here/.." && pwd)

cd "$repo_root/backend"

# Run alembic migrations (ensure your environment variables are set: DATABASE_URL)
if ! command -v alembic >/dev/null 2>&1; then
  echo "alembic not found in PATH. Activate your virtualenv or install dependencies first."
  exit 1
fi

echo "Running alembic upgrade head"
alembic upgrade head
