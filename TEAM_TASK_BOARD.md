# Team Task Board

| task | owner | difficulty | prerequisites | files to edit | blocked by | acceptance criteria |
|---|---|---|---|---|---|---|
| Implement Prisma schema and models | me | advanced | project spec review | prisma/schema.prisma | none | Models compile and include all required entities/status enums |
| Build Qualtrics ingestion adapter | me | advanced | schema + validation | src/lib/qualtrics/adapter.ts, src/lib/services/ingestion-service.ts | schema done | Mock payload ingests and stores submission/snapshot |
| Add webhook + poll placeholders | me | advanced | ingestion service | src/app/api/qualtrics/webhook/route.ts, src/app/api/qualtrics/poll/route.ts | ingestion done | Endpoints return success/error with proper validation |
| Implement scraping + safe fallback | me | advanced | ingestion service | src/lib/scraping/fetch-and-parse.ts | none | Broken fetch does not crash ingestion |
| Implement summarizer abstraction + mock | me | advanced | llm interfaces | src/lib/llm/*.ts | none | Deterministic summary generated in mock mode |
| Implement admin review actions | me | advanced | review service | src/app/api/admin/review/route.ts, src/app/api/admin/regenerate-summary/route.ts | ingestion snapshots exist | Approve/reject/edit/regenerate endpoints work |
| Implement newsletter export pipeline | me | advanced | publication renderer | src/lib/publication/newsletter.ts, src/app/api/admin/publication/export/route.ts | approved snapshots | Export persists markdown + html issue |
| Build homepage static sections | teammate | beginner | React JSX basics | src/content/home.ts, src/app/page.tsx | none | Copy updated, CTA links intact |
| Build About and FAQ content | teammate | beginner | JSX basics | src/app/about/page.tsx, src/app/faq/page.tsx | none | About and FAQ complete and readable |
| Style lab cards and badges | teammate | beginner | Tailwind basics | src/components/beginner-safe/LabCard.tsx, src/components/beginner-safe/StatusBadge.tsx | opportunities page data contract | Last updated remains visible |
| Improve loading/empty/error states | teammate | beginner | React component exports | src/components/beginner-safe/EmptyLoadingError.tsx | none | Distinct states shown for each condition |
| Polish newsletter signup form messages | teammate | beginner | controlled forms | src/components/beginner-safe/NewsletterSignupForm.tsx | signup API exists | Validation messages are clear and non-blocking |
| Expand manual QA checklist | teammate | beginner | browser testing | docs/manual-testing-checklist.md | core routes available | Checklist steps executable with pass/fail fields |
| Add additional seed demo records | teammate | intermediate | TypeScript object editing | prisma/seed.ts | schema stable | New labs appear in opportunities/admin pages |
