# Data Flow

## Ingestion path

1. Request enters `POST /api/qualtrics/webhook` or `POST /api/qualtrics/poll`.
2. Payload maps via [src/lib/qualtrics/adapter.ts](../src/lib/qualtrics/adapter.ts).
3. Zod validation runs in [src/lib/validation/qualtrics.ts](../src/lib/validation/qualtrics.ts).
4. Submission persists to `LabSubmission`.
5. Latest snapshot toggled false, new snapshot created in `LabSnapshot`.
6. Website fetch parser attempts enrichment.
7. Summary provider generates draft summary.
8. Snapshot enters `pending_review`.

## Review path

1. Admin reads queue from `GET /api/admin/submissions`.
2. Action endpoint applies transitions:
   - approve
   - reject
   - edit summary
   - regenerate summary
3. AuditLog records admin actions.

## Publication path

1. `POST /api/admin/publication/export` queries approved latest snapshots.
2. Renderer builds HTML + Markdown.
3. Issue saved as `PublicationIssue`.
