# How To Run Locally

## Prerequisites

- Node 20+
- pnpm 10+
- PostgreSQL (local or hosted)

## Steps

1. Install dependencies
   - `pnpm install`
2. Copy env template
   - `cp .env.example .env`
3. Set `DATABASE_URL` in `.env`
4. Generate Prisma client
   - `pnpm prisma:generate`
5. Push schema
   - `pnpm db:push`
6. Seed demo data
   - `pnpm db:seed`
7. Start app
   - `pnpm dev`

## Useful endpoints

- `POST /api/mock/ingest` for local mock ingestion
- `POST /api/jobs/staleness-audit` (requires ENABLE_CRON_JOBS=true)
