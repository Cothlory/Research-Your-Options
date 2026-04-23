#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "[dev] generating Prisma client"
pnpm prisma:generate

echo "[dev] syncing database schema"
pnpm db:push

if [[ "${RUN_DB_SEED:-false}" == "true" ]]; then
  echo "[dev] seeding database"
  pnpm db:seed
fi

if [[ "${RUN_LINT:-false}" == "true" ]]; then
  echo "[dev] running lint"
  pnpm lint
fi

if [[ "${RUN_TESTS:-false}" == "true" ]]; then
  echo "[dev] running unit tests"
  pnpm test:unit
fi

echo "[dev] starting Next.js dev server"
pnpm dev
