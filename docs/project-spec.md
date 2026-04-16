# Research Starters Hub — Technical Specification

## 1. Overview

Research Starters Hub is a web-based system for improving undergraduate access to research opportunities at UVA. The system collects faculty/lab recruitment information through a Qualtrics XM survey, processes and stores the data, optionally enriches it using public lab website content and LLM summarization, and generates a student-facing newsletter and searchable listing page.

This project exists because current undergraduate research discovery is fragmented, opaque, and highly dependent on confidence, prior exposure, and informal networks. The system is intended to reduce those barriers while keeping faculty maintenance burden low. The problem framing, constraints, solution direction, and lifecycle requirements come from the course report and client/user discovery materials. :contentReference[oaicite:1]{index=1}

---

## 2. Problem Statement

Undergraduate students at UVA face several barriers when trying to get involved in research:

- research information is distributed across many websites and informal channels
- students often do not know how to begin
- cold-emailing is the dominant entry mechanism
- many students lack confidence and assume they are underqualified
- faculty are unlikely to maintain complex or frequently updated systems

The desired system should make research discovery more centralized, transparent, low-friction, and sustainable, especially for early-year students and students without insider access. :contentReference[oaicite:2]{index=2}

---

## 3. Primary Goals

### 3.1 Product goals
- centralize research opportunity information
- make research entry steps more visible and less intimidating
- provide students with readable, comparable, up-to-date lab summaries
- reduce faculty maintenance burden
- support newsletter-based outreach and optional searchable listings

### 3.2 Success objectives
- increased student awareness of research pathways
- increased student self-reported confidence
- higher rates of informed outreach to labs
- positive user feedback on usability

These objectives are derived from the report’s problem definition and solution objectives. :contentReference[oaicite:3]{index=3}

---

## 4. Constraints

The implementation must respect the following constraints:

- **Minimal faculty maintenance**  
  The system should not depend on high-frequency manual faculty updates.

- **Scalability**  
  The design should work for at least SEAS-scale deployment and ideally be extensible to broader UVA usage.

- **Privacy and institutional compliance**  
  Student-related data handling must be designed with FERPA-aware boundaries in mind.

- **Long-term sustainability**  
  The system must tolerate missed survey cycles and stale source data.

- **Usability for underclassmen**  
  The interface must be understandable to students with limited research knowledge.

These constraints were explicitly identified in the report. :contentReference[oaicite:4]{index=4}

---

## 5. Stakeholders and Users

### 5.1 Client / institutional perspective
- advising or academic support stakeholders
- institutional goal: improve equitable access to undergraduate research

### 5.2 Primary users
- UVA undergraduate students
- especially first- and second-year students
- especially students lacking prior research exposure or informal networks

### 5.3 Secondary users
- faculty members
- lab representatives / ambassadors

### 5.4 Beneficiaries
- students
- faculty seeking motivated undergraduates
- UVA as an institution

Stakeholder distinctions are important because the system should optimize for student usability without creating excessive faculty overhead. :contentReference[oaicite:5]{index=5}

---

## 6. Solution Summary

The selected solution is a semester-based automated research opportunity pipeline:

1. faculty/lab representatives receive a Qualtrics XM survey twice per semester
2. responses are ingested by the backend
3. optional website content is fetched from the lab website URL
4. an LLM generates a short summary
5. summaries are stored and reviewed
6. approved entries are rendered into:
   - a student-facing listing page
   - a newsletter issue export for Substack or email distribution

A key product rule: each published entry must show a visible `last updated` timestamp, and that timestamp only changes when a new survey submission is received. If a lab does not respond in a later cycle, the previous approved version remains visible without pretending to be newly verified. :contentReference[oaicite:6]{index=6}

---

## 7. Scope

## 7.1 MVP in scope
- Qualtrics survey ingestion
- lab data normalization
- database storage with snapshots/history
- optional website scraping/parsing
- LLM summary generation with mock fallback
- admin review workflow
- student-facing searchable lab listing
- newsletter signup capture
- newsletter issue export as HTML/Markdown
- staleness handling and timestamp display

## 7.2 Out of scope for MVP
- real UVA SSO
- real Substack API publishing
- full production mailing infrastructure
- advanced role-based access control
- advanced analytics
- full FERPA compliance implementation beyond safe design notes and TODOs

---

## 8. System Requirements

### 8.1 Functional requirements

#### Faculty/lab input
- the system must support receiving lab recruitment data from Qualtrics XM
- each submission must include structured lab metadata fields
- the system must preserve the raw survey payload

#### Data processing
- the system must normalize survey data into internal schema
- the system must validate required fields
- the system must support partial or inconsistent input gracefully

#### Website enrichment
- if `website_url` exists, the system should fetch public content
- the system should extract relevant text safely
- failed fetches must not break ingestion

#### AI summarization
- the system should generate a short lab summary from survey data and/or website text
- all LLM usage must be abstracted behind a provider interface
- a deterministic mock summarizer must exist for local/dev mode
- all generated text must be reviewable before publication

#### Review and publishing
- admin users must be able to:
  - view submissions
  - inspect scraped content
  - inspect generated summaries
  - edit summaries
  - approve or reject entries
  - generate newsletter issue exports

#### Student experience
- students must be able to:
  - browse/search/filter labs
  - view recruiting status, website, summary, and last updated timestamp
  - sign up for newsletter updates

#### Lifecycle and staleness
- if no updated submission arrives for a cycle, the previous approved entry remains
- stale content must not be silently treated as newly updated
- repeated non-response should allow eventual `stale` or `archived` states

### 8.2 Non-functional requirements
- maintainable and modular codebase
- clear separation between ingestion, domain logic, and UI
- mock-friendly local development
- typed interfaces
- testable services
- safe failure handling for external integrations
- deployable to a simple cloud platform such as Render

---

## 9. Data Model

The MVP should include at least the following entities:

### 9.1 Lab
Canonical lab identity.

Suggested fields:
- `id`
- `labName`
- `facultyName`
- `facultyEmail`
- `websiteUrl`
- `currentStatus`
- `createdAt`
- `updatedAt`

### 9.2 LabSubmission
Raw and normalized survey submission record.

Suggested fields:
- `id`
- `labId`
- `source = qualtrics`
- `rawPayload`
- `normalizedPayload`
- `submittedAt`
- `ingestionStatus`
- `validationErrors`

### 9.3 LabSnapshot
Versioned publication-ready lab state.

Suggested fields:
- `id`
- `labId`
- `recruitingUndergrads`
- `researchArea`
- `optionalNotes`
- `desiredSkills`
- `websiteUrl`
- `summaryText`
- `sourceText`
- `lastVerifiedAt`
- `status`
- `isLatest`
- `createdAt`

### 9.4 SummaryDraft
Generated or edited summary before final approval.

Suggested fields:
- `id`
- `labSnapshotId`
- `generatorType` (`mock`, `openai`, `manual`)
- `promptVersion`
- `inputText`
- `outputText`
- `reviewStatus`
- `createdAt`

### 9.5 PublicationIssue
Newsletter export unit.

Suggested fields:
- `id`
- `title`
- `semesterLabel`
- `issueStatus`
- `generatedHtml`
- `generatedMarkdown`
- `generatedAt`

### 9.6 StudentSubscriber
Student mailing list record.

Suggested fields:
- `id`
- `email`
- `isActive`
- `subscribedAt`
- `unsubscribedAt`

### 9.7 AdminUser
Basic admin identity for MVP.

Suggested fields:
- `id`
- `email`
- `passwordHash`
- `role`
- `createdAt`

### 9.8 AuditLog
Action/event log.

Suggested fields:
- `id`
- `entityType`
- `entityId`
- `action`
- `actorType`
- `actorId`
- `metadata`
- `createdAt`

---

## 10. State Model

### 10.1 Entry statuses
Each publication-oriented lab entry should use explicit lifecycle states:

- `pending_ingestion`
- `pending_summary`
- `pending_review`
- `approved`
- `rejected`
- `stale`
- `archived`

### 10.2 Source provenance
Each derived field should record provenance where possible:

- `from_survey`
- `from_website`
- `from_llm`
- `from_manual_edit`

### 10.3 State transitions
Typical path:

`pending_ingestion -> pending_summary -> pending_review -> approved`

Possible alternate transitions:

- `pending_review -> rejected`
- `approved -> stale`
- `stale -> archived`
- `pending_summary -> pending_review` even if scraping fails, as long as survey data is still usable

---

## 11. Input Schema

The initial survey input should support these fields:

- `lab_name`
- `faculty_name`
- `faculty_email`
- `research_area`
- `recruiting_undergrads`
- `website_url`
- `optional_notes`
- `desired_skills`
- `last_confirmed_by_submitter`

Validation rules:
- `lab_name`: required
- `faculty_email`: recommended, should validate if present
- `recruiting_undergrads`: required
- `website_url`: optional but validate if present
- `research_area`: optional but preferred
- empty or malformed submissions should be flagged, not dropped silently

---

## 12. High-Level Architecture

```text
Faculty/Lab Rep
   -> Qualtrics XM Survey
   -> Ingestion Endpoint / Poller
   -> Normalization + Validation Service
   -> Website Fetch/Parse Service (optional)
   -> LLM Summarization Service (optional)
   -> Review Queue / Admin Dashboard
   -> Approved Snapshot Storage
   -> Publication Renderer
   -> Student Listing Page + Newsletter Export
```

### 12.1 Layers
**A. Input layer**
- Qualtrics webhook endpoint
- Qualtrics polling fallback
- faculty directory / contact source placeholder

**B. Processing layer**
- schema validation
- normalization
- deduplication / lab matching
- scrape/enrichment pipeline

**C. AI layer**
- summarization provider interface
- mock summarizer
- OpenAI-backed summarizer placeholder
**D. Review layer**
- manual QA
- formatting validation
- broken link detection
- missing timestamp detection
**E. Storage layer**
- canonical lab records
- raw submissions
- snapshots
- drafts
- audit logs
- publication issues
- subscribers
**F. Delivery layer**
- student-facing listing page
- newsletter export generator
- future mailing/substack hooks

This layered architecture is directly motivated by the report’s module breakdown: faculty/lab layer, automation/data pipeline, AI processing/validation, storage/publication, and student access layer.

## 13. Core Product Rules
### 13.1 Last updated rule

Every published entry must display a visible last updated date.

### 13.2 Timestamp update rule

The timestamp only changes when a new faculty/lab submission is received and accepted.

### 13.3 Persistence rule

If no new survey is submitted in the current cycle, retain the most recent approved version.

### 13.4 Transparency rule

Do not present reused old entries as newly verified.

### 13.5 Review rule

LLM summaries must pass a review path before publication.

These rules are central to the report’s selected design and maintenance logic.

## 14. Operating Conditions and Failure Modes

The system must tolerate:

- incomplete survey responses
- delayed faculty participation
- broken or outdated lab websites
- inaccessible webpage content
- noisy or overly long website text
- LLM output inaccuracies
- missed semester-cycle responses
- temporary integration outages

Expected handling:

- failed scraping should not block basic survey ingestion
- missing summary should still allow admin review with manual edit option
- publication pipeline should skip invalid entries instead of failing the entire issue
- all major failures should generate logs and audit entries
## 15. Admin Workflow
1. inspect incoming survey submissions
2. review normalized fields
3. inspect fetched website content if available
4. inspect generated summary
5. edit summary if needed
6. approve or reject the entry
7. include approved entries in publication issue generation

Admin actions that must be logged:

- approve
- reject
- edit summary
- regenerate summary
- archive entry
- generate newsletter issue
## 16. Student Workflow
1. visit homepage
2. browse or search research opportunities
3. filter by recruiting status
4. open lab details / external website
5. view visible last-updated date
6. sign up for newsletter

The student experience should prioritize clarity, comparability, and low-friction navigation because the underlying problem is not only information absence but also psychological and procedural barriers.

## 17. Beginner-Friendly Team Task Boundaries

Because some teammates are new to programming, beginner-safe work should be isolated away from critical domain logic.

### 17.1 Good beginner tasks
- homepage static content sections
- About / FAQ page
- lab card presentation components
- loading / empty / error state components
- status badges and simple UI tags
- newsletter signup form UI
- client-side validation messages
- seed demo data additions
- markdown documentation
- manual QA checklist writing
### 17.2 Not beginner-safe
- database schema
- ingestion adapters
- webhook logic
- scraping/parsing
- LLM integration
- status transition logic
- snapshot/versioning
- auth
- publication pipeline
- deployment config
18. Testing Strategy

The report proposes four practical testing sequences, which should be converted into engineering test categories.

### 18.1 Interest / adoption testing

Goal:

- determine whether students are interested in subscribing to the service

Implementation idea:

- simple sign-up landing page or interest form
- measure sign-up count and qualitative feedback
### 18.2 Ingestion/output testing

Goal:

- verify that a simulated faculty survey can produce a newsletter-ready entry

Implementation idea:

- submit mock Qualtrics payload
- verify normalization, summary generation, storage, and export
### 18.3 Summary accuracy testing

Goal:

- verify that generated summaries are relevant and accurate enough

Implementation idea:

- faculty/lab reps review generated summaries
- rate on a simple numeric accuracy scale
### 18.4 Student usefulness testing

Goal:

- verify that students find the output helpful and understandable

Implementation idea:

- send a generated sample issue to test users
- collect helpfulness/usability ratings
### 18.5 Engineering test categories
- unit tests for validation and mapping
- unit tests for state transition helpers
- unit tests for newsletter export formatting
- integration tests for ingestion -> summary -> review path
- UI tests for search/filter behavior
- smoke tests for mock mode
## 19. Maintenance and Lifecycle

Expected recurring lifecycle per semester:

1. pre-semester survey distribution
2. response collection and ingestion
3. summary generation and review
4. publication
5. mid-semester redistribution
6. second publication cycle
7. stale-entry handling and carry-forward

Recurring maintenance tasks:

- verify faculty/lab contact list
- check API credentials and quotas
- review failed fetches or summaries
- update prompts or summarization logic
- audit stale entries
- maintain subscriber list hygiene

A reasonable staleness policy:

- one missed cycle: keep prior approved entry visible
- repeated missed cycles: mark entry stale
- long-term inactivity: move entry to archived

This policy is directly supported by the report’s maintenance section.

## 20. Security / Privacy Notes

For MVP:

- do not store more student data than necessary
- separate admin and student functions
- keep secrets in environment variables
- avoid exposing raw survey payloads publicly
- record TODOs for institutional auth, data retention, and compliance review

Future production hardening:

- SSO integration
- role-based permissions
- mailing compliance workflow
- data retention policy
- secure audit export
- operational monitoring
## 21. Recommended MVP Stack
- Frontend: Next.js + TypeScript + Tailwind
- Backend: Next.js route handlers / server actions
- Database: PostgreSQL + Prisma
- Validation: Zod
- Testing: Vitest + Playwright
- Jobs: cron-triggered scripts or route-based scheduled jobs
- Deployment: Render
- LLM provider: provider abstraction with mock fallback
- Survey source: Qualtrics XM
## 22. File/Module Planning

Suggested major modules:

- app/
  - student-facing pages
  - admin pages
- components/
  - reusable UI components
- lib/qualtrics/
  - webhook/poller adapters
- lib/scraping/
  - webpage fetch and extraction
- lib/llm/
  - summarizer interface + providers
- lib/publication/
  - newsletter issue generation
- lib/validation/
  - Zod schemas
- lib/domain/
  - status logic, snapshot rules
- prisma/
  - schema, migrations, seed
docs/
architecture and teammate guides
## 23. Acceptance Criteria for MVP

The MVP is acceptable if all of the following work:

- a mock or real Qualtrics submission can be ingested
- a lab record and versioned snapshot are created
- optional website fetch runs safely
- a mock or real summary is generated
- an admin can review and approve the entry
- an approved entry appears in the student-facing listing
- the listing shows recruiting status and last updated timestamp
- a newsletter issue export can be generated from approved entries
- the project runs locally with mock integrations only
## 24. Open Questions / Future Extensions
- how faculty contact lists will be sourced and maintained
- whether newsletter signup is open or restricted to UVA addresses
- whether lab ambassadors can submit on behalf of faculty
- whether archived/stale entries should remain searchable
- whether student personalization should be added later
- whether the searchable listing and newsletter should share one publication pipeline or two separate view models
## 25. Engineering Principle for This Project

Automate repetitive collection and formatting work, but keep a review boundary before publication.

This principle is necessary because the system must reduce manual burden while avoiding low-quality or misleading output at scale. It is also explicitly aligned with the report’s proposed compromise between automation and reliability.