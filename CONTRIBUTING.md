# CONTRIBUTING

This project is a team codebase with mixed experience levels.

## Ownership Rules

Advanced/core files contain:
- `CORE LOGIC - avoid editing unless assigned`

Beginner-safe files contain:
- `BEGINNER SAFE - teammate task area`

Ownership TODO markers:
- `TODO(owner=me)` for advanced integration work
- `TODO(owner=teammate)` for beginner-safe tasks

## What Beginners Should Edit

- [src/components/beginner-safe](src/components/beginner-safe)
- [src/content](src/content)
- [src/app/about/page.tsx](src/app/about/page.tsx)
- [src/app/faq/page.tsx](src/app/faq/page.tsx)
- [docs](docs) content guides/checklists

## What Beginners Should Not Edit

- [src/lib/services](src/lib/services)
- [src/lib/qualtrics](src/lib/qualtrics)
- [src/lib/scraping](src/lib/scraping)
- [src/lib/llm](src/lib/llm)
- [src/app/api](src/app/api)
- [prisma/schema.prisma](prisma/schema.prisma)

## Workflow

1. Create a branch from `main`.
2. Keep PRs small and single-purpose.
3. Add/update docs if behavior changes.
4. Run checks before PR:
   - `pnpm lint`
   - `pnpm test:unit`
5. Add screenshots for UI-only changes.

## Commit Convention

Use descriptive messages:
- `feat(ui): improve lab card accessibility`
- `docs(beginner): add FAQ task checklist`
- `fix(api): handle empty summary validation`

## Code Review Expectations

- Verify ownership boundaries were respected.
- Confirm no secrets were committed.
- Confirm task acceptance criteria in [TEAM_TASK_BOARD.md](TEAM_TASK_BOARD.md).
