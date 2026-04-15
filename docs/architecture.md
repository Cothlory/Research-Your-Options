# Architecture

## Layered Design

- Input layer: Qualtrics scheduled export ingestion + API polling fallback + scheduled faculty campaign outreach.
- Processing layer: normalization, validation, dedup matching.
- Enrichment layer: website fetch/parse utility.
- AI layer: summarizer provider interface with mock fallback.
- Review layer: admin actions for approve/reject/edit/regenerate.
- Storage layer: Prisma models for labs, submissions, snapshots, drafts, publication, campaign tracking, subscribers, admins, audits.
- Delivery layer: public listing pages + newsletter export endpoint + Google Sheets sync + Substack publish endpoint.

## Why this structure

This architecture isolates high-risk logic in [src/lib/services](../src/lib/services) and [src/app/api](../src/app/api), while keeping beginner tasks in [src/components/beginner-safe](../src/components/beginner-safe) and content pages.

## Ownership boundary

- CORE LOGIC files: advanced owner only.
- BEGINNER SAFE files: teammate-safe edits.
