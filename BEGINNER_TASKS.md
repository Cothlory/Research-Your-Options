# Beginner Tasks Guide

This file gives low-risk teammate tasks with exact edit boundaries.

## Task 1: Homepage Content Polish

- Difficulty: beginner
- Edit files:
  - [src/content/home.ts](src/content/home.ts)
  - [src/app/page.tsx](src/app/page.tsx)
- Do not edit:
  - [src/app/api](src/app/api)
  - [src/lib/services](src/lib/services)
- Prerequisites: basic React props and JSX text editing
- Run/test:
  - `pnpm dev`
  - open `/` and confirm content displays
- Example pattern: update text constants in [src/content/home.ts](src/content/home.ts)
- Definition of done: copy is clear, typo-free, and matches project tone
- Common mistakes: deleting CTA links, changing API paths

## Task 2: About + FAQ Expansion

- Difficulty: beginner
- Edit files:
  - [src/app/about/page.tsx](src/app/about/page.tsx)
  - [src/app/faq/page.tsx](src/app/faq/page.tsx)
- Do not edit:
  - [src/lib](src/lib)
- Prerequisites: simple arrays and JSX mapping
- Run/test: `pnpm dev`, verify `/about` and `/faq`
- Example pattern: add new FAQ objects to local array in [src/app/faq/page.tsx](src/app/faq/page.tsx)
- Definition of done: at least 6 clear FAQ entries, readable formatting
- Common mistakes: nested unsupported markdown, broken JSX commas

## Task 3: Lab Card Styling

- Difficulty: beginner
- Edit files:
  - [src/components/beginner-safe/LabCard.tsx](src/components/beginner-safe/LabCard.tsx)
  - [src/components/beginner-safe/StatusBadge.tsx](src/components/beginner-safe/StatusBadge.tsx)
- Do not edit:
  - [src/lib/services/publication-service.ts](src/lib/services/publication-service.ts)
- Prerequisites: Tailwind utility classes
- Run/test: `pnpm dev`, open `/opportunities`
- Example pattern: adjust spacing classes only, preserve field names
- Definition of done: mobile + desktop both readable
- Common mistakes: renaming props, removing last-updated text

## Task 4: Empty/Loading/Error States

- Difficulty: beginner
- Edit files:
  - [src/components/beginner-safe/EmptyLoadingError.tsx](src/components/beginner-safe/EmptyLoadingError.tsx)
- Do not edit:
  - [src/app/api/opportunities/route.ts](src/app/api/opportunities/route.ts)
- Prerequisites: React functional components
- Run/test: simulate no data and verify empty state copy
- Example pattern: keep component exports unchanged
- Definition of done: all 3 states visually distinct
- Common mistakes: removing exported function names

## Task 5: Newsletter Signup UI Validation Message

- Difficulty: beginner
- Edit files:
  - [src/components/beginner-safe/NewsletterSignupForm.tsx](src/components/beginner-safe/NewsletterSignupForm.tsx)
- Do not edit:
  - [src/app/api/newsletter-signup/route.ts](src/app/api/newsletter-signup/route.ts)
- Prerequisites: controlled input state
- Run/test: submit invalid and valid email in `/`
- Example pattern: add helper text, keep POST endpoint the same
- Definition of done: clear client-side validation message appears
- Common mistakes: changing request body format

## Task 6: Seed Data Additions

- Difficulty: beginner/intermediate
- Edit files:
  - [prisma/seed.ts](prisma/seed.ts)
- Do not edit:
  - [prisma/schema.prisma](prisma/schema.prisma)
- Prerequisites: JSON-like TypeScript objects
- Run/test:
  - `pnpm db:seed`
  - verify records in admin page
- Example pattern: add one additional `lab` + `labSnapshot`
- Definition of done: app renders added seed item in UI
- Common mistakes: duplicate IDs, missing required fields

## Task 7: Manual QA Checklist and Screenshots

- Difficulty: beginner
- Edit files:
  - [docs/manual-testing-checklist.md](docs/manual-testing-checklist.md)
  - create screenshot assets under `docs/` if desired
- Do not edit: core backend/service files
- Prerequisites: browser testing basics
- Run/test: execute each checklist item and mark pass/fail
- Definition of done: checklist updated with evidence links
- Common mistakes: skipping mobile view checks
