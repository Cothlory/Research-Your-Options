# Data Flow

## Ingestion path

1. Scheduled campaign launch runs from `POST /api/jobs/semester-campaign` and emails active professor contacts.
2. At grace close, `POST /api/jobs/qualtrics-batch-import` runs a Qualtrics Response Export job for the campaign window.
3. Export records are filtered by `waveId` embedded data and deduplicated by `responseId`.
4. Payload maps via [src/lib/qualtrics/adapter.ts](../src/lib/qualtrics/adapter.ts).
3. Zod validation runs in [src/lib/validation/qualtrics.ts](../src/lib/validation/qualtrics.ts).
4. Submission persists to `LabSubmission`.
5. Latest snapshot toggled false, new snapshot created in `LabSnapshot`.
6. Website fetch parser attempts enrichment.
7. Summary provider generates draft summary.
8. Snapshot enters `pending_review`.
9. Invitation tracker marks matching professor email as responded.
10. Latest rows sync to Google Sheets for Figma sync.

## Reminder path

1. `POST /api/jobs/reminder-email` finds invitations older than grace window with no response.
2. Reminder emails are sent.
3. Campaign closes after grace window.
4. Closed campaigns trigger one batch export/import run for that wave.

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
4. Optional `POST /api/admin/publication/publish` sends templated post to Substack endpoint.
5. If Substack endpoint is not configured, issue can fallback to SMTP delivery to active student subscribers.
