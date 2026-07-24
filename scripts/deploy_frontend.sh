#!/usr/bin/env bash
# Build the frontend and copy the production build into backend/static/
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
repo_root=$(cd "$here/.." && pwd)

echo "Building frontend..."
cd "$repo_root/frontend"

# Optionally set VITE_API_BASE_URL in the environment when building
if [ -z "${VITE_API_BASE_URL:-}" ]; then
  echo "Warning: VITE_API_BASE_URL not set, defaulting to http://localhost:5555"
  export VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:5555}
fi

pnpm install
pnpm build

echo "Copying build to backend/static/..."
cd "$repo_root"
mkdir -p backend/static
# Use rsync to preserve uploads and only replace built files
rsync -av --delete --exclude 'uploads' frontend/dist/ backend/static/

echo "Frontend build deployed to backend/static/"
