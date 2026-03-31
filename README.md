# Research Starters Hub MVP

Research Starters Hub ingests faculty/lab recruiting information from Qualtrics, enriches and summarizes it, then exposes reviewed opportunities to students via listing pages and newsletter exports.

Source-of-truth specification: [docs/project-spec.md](docs/project-spec.md)

## Architecture Decision

- Frontend + backend: Next.js App Router with TypeScript route handlers.
- Persistence: PostgreSQL via Prisma.
- Validation: Zod schemas.
- AI: provider interface with deterministic mock fallback.
- Scheduling: cron-friendly route placeholders, gated by env flags.

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
	- `POST /api/jobs/staleness-audit`

## Mock Mode

- `MOCK_MODE=true` yields deterministic summary output.
- `POST /api/mock/ingest` creates a full mock ingestion run.
