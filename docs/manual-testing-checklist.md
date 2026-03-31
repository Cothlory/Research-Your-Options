# Manual Testing Checklist

## Public student site

- [ ] Home page renders hero, CTA, and newsletter form
- [ ] Opportunities page loads without crashing
- [ ] Search by lab name filters list
- [ ] Search by topic filters list
- [ ] Department filter works
- [ ] Recruiting filter works
- [ ] Every listing shows a visible last-updated timestamp
- [ ] About page content is readable
- [ ] FAQ page content is readable

## Admin dashboard

- [ ] Click "Ingest mock submission" creates queue item
- [ ] Parsed website text panel opens
- [ ] Approve action updates status
- [ ] Reject action updates status
- [ ] Edit summary saves manual text
- [ ] Regenerate summary returns generated text
- [ ] Trigger newsletter export completes

## API / reliability

- [ ] Webhook endpoint rejects invalid secret when configured
- [ ] Poll endpoint returns mock response
- [ ] Broken website fetch does not crash ingestion
- [ ] Empty summary edit returns validation error

## Notes section

- Date tested:
- Tester:
- Environment:
- Observed issues:
