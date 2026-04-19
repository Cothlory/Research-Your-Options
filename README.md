# Research Your Options MVP

Research Your Options ingests faculty/lab recruiting information from Qualtrics, enriches and summarizes it, then exposes reviewed opportunities to students via listing pages and newsletter exports.

Source-of-truth specification: [docs/project-spec.md](docs/project-spec.md)

## Architecture Decision

- Frontend + backend: Next.js App Router with TypeScript route handlers.
- Persistence: PostgreSQL via Prisma.
- Validation: Zod schemas.
- AI: provider interface with deterministic mock fallback.
- Scheduling: cron-friendly campaign/reminder jobs, gated by env flags.

Rationale: fastest production-friendly MVP with clear modular boundaries.

## Ownership Split

Advanced ownership:
- [src/lib/services/ingestion-service.ts](src/lib/services/ingestion-service.ts)
- [src/lib/services/review-service.ts](src/lib/services/review-service.ts)
- [src/lib/services/publication-service.ts](src/lib/services/publication-service.ts)
- [src/lib/qualtrics/adapter.ts](src/lib/qualtrics/adapter.ts)
- [src/lib/scraping/fetch-and-parse.ts](src/lib/scraping/fetch-and-parse.ts)
- [src/lib/llm/service.ts](src/lib/llm/service.ts)
- [src/app/api](src/app/api)
- [prisma/schema.prisma](prisma/schema.prisma)

Beginner-safe ownership:
- [src/components/beginner-safe](src/components/beginner-safe)
- [src/content](src/content)
- [src/app/about/page.tsx](src/app/about/page.tsx)
- [src/app/faq/page.tsx](src/app/faq/page.tsx)
- [docs/beginner-ui-guide.md](docs/beginner-ui-guide.md)
- [docs/beginner-form-guide.md](docs/beginner-form-guide.md)

## Folder Layout

```text
src/
	app/
		api/                  # CORE LOGIC routes
		admin/                # admin dashboard UI
		opportunities/        # public listings
		about/ faq/           # BEGINNER SAFE static pages
	components/
		core/                 # shared app shell/core UI
		beginner-safe/        # teammate-owned presentational components
	content/                # BEGINNER SAFE static copy
	lib/
		config/ db/ types/
		domain/ validation/
		qualtrics/ scraping/ llm/
		services/ publication/
prisma/
	schema.prisma
	seed.ts
tests/
	unit/
	e2e/
docs/
	project-spec.md
	project-overview.md
	architecture.md
	data-flow.md
	how-to-run-locally.md
	beginner-ui-guide.md
	beginner-form-guide.md
	manual-testing-checklist.md
```

## Package Setup Commands

```bash
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm db:push
pnpm db:seed
pnpm dev
```

## Environment

Environment template: [.env.example](.env.example)

Keep placeholders for local-first development, then replace with real values in deployment secrets.

Integration groups:
- Qualtrics campaign + polling: `QUALTRICS_*`, `SURVEY_CAMPAIGN_DATES`, `SURVEY_GRACE_DAYS`
- Qualtrics batch import specifics: `QUALTRICS_DEFAULT_TIMEZONE`, `QUALTRICS_WAVE_EMBEDDED_DATA_KEY`
- OpenAI structured summaries: `OPENAI_*`
- Google Sheets sync: `GOOGLE_SHEETS_*`, `GOOGLE_SERVICE_ACCOUNT_*`
- Substack publishing: `SUBSTACK_*` (supports `SUBSTACK_API_TOKEN` or cookie-style auth via `SUBSTACK_AUTH_COOKIE`, such as `connect.sid=...`)
- Card image URLs in Substack markdown use `APP_BASE_URL`; set this to your public deployment URL in production.
- SMTP delivery for faculty reminders and subscriber fallback: `SMTP_*`, `EMAIL_FROM`

## Test Commands

```bash
pnpm lint
pnpm test:unit
pnpm test:e2e
```

## Deployment Notes (Render)

- Set all env vars from [.env.example](.env.example).
- Build command: `pnpm install && pnpm prisma:generate && pnpm build`
- Start command: `pnpm start`
- Optional cron route triggers:
	- `POST /api/jobs/semester-campaign`
	- `POST /api/jobs/reminder-email`
	- `POST /api/jobs/qualtrics-batch-import`
	- `POST /api/jobs/staleness-audit`

## Implemented Automation Pipeline

1. Manage professor list via `GET/PUT/PATCH /api/admin/professors`.
2. Trigger `POST /api/jobs/semester-campaign` to launch due campaign dates and send survey invitations.
3. After grace closes, run `POST /api/jobs/qualtrics-batch-import` (or `POST /api/qualtrics/poll`) to pull responses through Qualtrics Export API.
4. Ingestion updates DB, regenerates latest snapshot, and marks invitation as responded.
5. Updated rows sync to Google Sheets (`lab name`, `summary`, `qualifications`, `link`).
6. Build issue export via `POST /api/admin/publication/export`.
7. Publish via `POST /api/admin/publication/publish`; it auto-generates card image URLs for all approved latest snapshots, with optional manual poster URL overrides.

Supporting admin endpoints:
- `POST /api/admin/publication/sync-sheet`
- `POST /api/admin/publication/publish`
- `POST /api/admin/publication/manual-email`

## Mock Mode

- `MOCK_MODE=true` yields deterministic summary output.
- `POST /api/mock/ingest` creates a full mock ingestion run.
