#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

MODE="${1:-build}"

sync_prisma() {
  echo "[prod] generating Prisma client"
  pnpm prisma:generate

  if [[ -n "$(find prisma/migrations -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)" ]]; then
    echo "[prod] applying Prisma migrations"
    pnpm prisma migrate deploy
  else
    echo "[prod] syncing database schema with prisma db push"
    pnpm db:push
  fi
}

case "$MODE" in
  prepare)
    sync_prisma
    ;;
  build)
    sync_prisma
    if [[ "${RUN_LINT:-false}" == "true" ]]; then
      echo "[prod] running lint"
      pnpm lint
    fi
    echo "[prod] building Next.js app"
    pnpm build
    ;;
  start)
    echo "[prod] starting Next.js production server"
    pnpm start
    ;;
  all)
    sync_prisma
    if [[ "${RUN_LINT:-false}" == "true" ]]; then
      echo "[prod] running lint"
      pnpm lint
    fi
    echo "[prod] building Next.js app"
    pnpm build
    echo "[prod] starting Next.js production server"
    pnpm start
    ;;
  *)
    echo "Usage: $0 [prepare|build|start|all]" >&2
    exit 1
    ;;
esac
