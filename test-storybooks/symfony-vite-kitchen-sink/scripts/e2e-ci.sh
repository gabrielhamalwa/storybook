#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_DIR}"

yarn vite --host 127.0.0.1 > /tmp/symfony-vite-kitchen-sink-vite.log 2>&1 &
VITE_PID=$!
trap 'kill "${VITE_PID}" 2>/dev/null || true' EXIT

for i in $(seq 1 30); do
  if curl -s --max-time 2 http://127.0.0.1:5173/build/assets/app.js >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

yarn e2e
