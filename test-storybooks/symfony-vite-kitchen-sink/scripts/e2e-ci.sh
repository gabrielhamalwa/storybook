#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_DIR}"

yarn vite --host 127.0.0.1 > /tmp/symfony-vite-kitchen-sink-vite.log 2>&1 &
VITE_PID=$!

yarn storybook > /tmp/symfony-vite-kitchen-sink-storybook.log 2>&1 &
STORYBOOK_PID=$!

cleanup() {
  kill "${VITE_PID}" 2>/dev/null || true
  kill "${STORYBOOK_PID}" 2>/dev/null || true
}
trap cleanup EXIT

for i in $(seq 1 30); do
  if curl -s --max-time 2 http://127.0.0.1:5173/build/assets/app.js >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

for i in $(seq 1 30); do
  if curl -s --max-time 2 http://127.0.0.1:6006 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

SYMFONY_URL=$(grep -oE 'http://127\.0\.0\.1:[0-9]+' /tmp/symfony-vite-kitchen-sink-storybook.log | tail -1)
if [ -n "${SYMFONY_URL}" ]; then
  for i in $(seq 1 30); do
    if curl -s --max-time 2 "${SYMFONY_URL}/_storybook/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

yarn e2e
