# Changelog

All notable changes to ProfileForge are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — Reverse Job Board (2026-09-12)

### New Feature
- **Reverse job board** (`/reverse-board`): workers post "here's exactly what I want to work on and why" and companies (other users) apply to hire them — flipping the normal job-board dynamic.

**Server**
- `server/models/ReversePost.js` — one post per user (unique index), headline/why/skills, work mode, employment type, locations, salary, availability, portfolio; lifecycle `draft → published → paused → closed`; denormalized `inquiryCount` for board sorting; `toPublicPost()` whitelist that never leaks the owner's account email.
- `server/models/ReverseInquiry.js` — hiring-side application to a worker; unique index on `(post, fromUser)` (no spam); status `new → accepted | declined`; `toOwnerView()` hides the inquirer's email until accepted.
- `server/controllers/reverseBoardController.js` + `server/routes/reverseBoardRoutes.js` — endpoints mounted at `/api/reverse`: `GET/PUT /me`, `POST /me/status/:status`, `GET /board` (skill/work-mode/employment-type filters; case-insensitive skill match with regex escaping), `POST /inquiries`, `GET /inquiries/received|sent`, `POST /inquiries/:id/respond` (accept reveals contact email; decline; single response enforced).
- Zod schemas `reversePostSchema`, `reverseInquirySchema`, `reverseInquiryActionSchema` in `server/middleware/validate.js`; all routes behind `protect`.

**Client**
- `client/src/pages/reverseBoard.jsx` — 4-tab page: Browse talent (card grid + skill/work-mode filters + apply-to-hire modal), My post (editor with publish/pause/close/unpublish), Inquiries inbox (accept reveals contact), Sent.
- `client/src/services/reverseBoardApi.js` — API service.
- Route `/reverse-board` (lazy) in `App.jsx`; navbar entry "🔄 Reverse".

**Privacy rules enforced**
- Board/public views never include the owner's user document or account email.
- Inquirer email is only revealed to the worker after the worker accepts; worker email never returned by any endpoint (inquirer replies via the accepted contact the worker chooses to share).

### Tests
- `server/reverseBoard.test.js` — 32 tests: schema shape, enums, unique indexes, skill setter dedup/cap, public-view sanitization (no email/password/`user` leak), validation schemas.
- Full suite: 257 server tests, 9 client tests, all green.

## [Unreleased] — Milestone 7 Accessibility & Performance (2026-09-09)

### Accessibility Improvements
- Added global focus styles with visible focus rings for keyboard navigation
- Added skip-to-content link at the top of the page
- Added aria-live region for dynamic screen reader announcements
- Added `announce()` utility in `client/src/utils/announce.js` for any page to announce changes
- Added ARIA labels to navbar: `aria-label="Main navigation"`, `aria-expanded`, `aria-haspopup`, `aria-label="Toggle navigation menu"`
- Added `role="dialog"` and `aria-modal` to mobile sidebar
- Added `role="status"` and `aria-label="Loading"` to loading placeholder
- Added prefers-reduced-motion CSS media query already existed; verified it covers all decorative animations

### Performance Improvements
- Converted all 15 page imports to route-level `React.lazy()` code splitting
- Added `<Suspense>` boundary with loading placeholder around routes
- Bundle split: main chunk 202 KB + 17 page-specific chunks (largest: output 985 KB including html2pdf)
- Total dist: 1.5 MB (was monolithic before splitting)

### Bug Fixes
- Fixed duplicate `</Routes>` closing tag in App.jsx that was a latent JSX parse error

### Files Changed
- `client/src/App.jsx` — lazy imports, Suspense boundary, duplicate tag fix
- `client/src/utils/announce.js` — new live-announcement utility
- `client/src/styles/global.css` — a11y CSS additions (focus, skip-link, reduced-motion)

## [Unreleased] — Milestone 6 Application Tracking (2026-09-09)

### Extended Application Model
- Updated `server/models/Application.js` with:
  - **Controlled status enum**: saved → preparing → applied → screening → interview → offer → accepted (terminal); rejected/withdrawn can re-apply to saved
  - **Job snapshot**: frozen copy of job data (title, company, location, source, description, salary, applyUrl, skills) at creation time
  - **Document version linkage**: `resumeVersionId`, `coverLetterVersionId`, `documentId` fields linking to DocumentVersion and Document models
  - **Timeline fields**: `submittedAt`, `followUpAt` (for reminders)
  - **Action tracking**: `nextAction` field for dashboard grouping
  - **Indexes**: added `{ user, status }` for dashboard queries and `{ user, followUpAt }` for follow-up reminders

### Status Transition Enforcement
- `isValidTransition(from, to)` — validates transitions against a rules map:
  - `saved → preparing, applied, withdrawn`
  - `preparing → applied, saved, withdrawn`
  - `applied → screening, interview, rejected, withdrawn`
  - `screening → interview, rejected, withdrawn`
  - `interview → offer, screening, rejected, withdrawn`
  - `offer → accepted, rejected, withdrawn`
  - `accepted` → terminal (no transitions)
  - `rejected → saved` (re-apply)
  - `withdrawn → saved` (re-apply)
- Invalid transitions return a clear error message with allowed options
- Auto-sets `appliedAt` and `submittedAt` on the applied transition

### Extended Application API
- `POST /api/applications` — create or update with validation
  - Accepts jobSnapshot, documentId, resumeVersionId, coverLetterVersionId
  - Enforces status transitions on update
  - Auto-sets timestamps on key transitions
- `GET /api/applications` — list with optional grouping
  - `?groupBy=status` — returns `{ grouped: { saved: [...], applied: [...], ... } }`
  - `?groupBy=nextAction` — groups by next action text
  - `?status=applied` — filter by status
- `GET /api/applications/:id` — single application with `nextStatuses` array
- `PUT /api/applications/:id` — update with transition enforcement
- `DELETE /api/applications/:id` — delete (ownership-checked)
- `GET /api/applications/transitions/:status` — get valid next statuses for UI

### Validation Schemas
- `applicationCreateSchema` — validates create payload (jobId required; status enum enforced; jobSnapshot with nested fields)
- `applicationUpdateSchema` — validates update payload (status enum enforced; notes, nextAction, document IDs optional)

### Tests
- `server/application.test.js` — 47 tests covering:
  - Status transitions (21 valid transitions, 4 invalid, same-status no-op, unknown status)
  - getNextStatuses (saved, accepted terminal, rejected re-apply, unknown)
  - Validation schemas (create minimal, create full, reject invalid status, all valid statuses, update variants)
  - VALID_TRANSITIONS completeness (all statuses covered, no unknown references)
  - Ownership (user required, jobId required, unique index on user+jobId)
  - Document version linkage (all fields present in schema)

### Preserved Behavior
- Existing application CRUD still works (upsert on jobId)
- Existing client UI unchanged
- All existing tests still pass (178 server + 9 client)
- Client build still succeeds

## [Unreleased] — Milestone 5 Fact-Grounded Tailoring (2026-09-09)

### DocumentVersion Model
- Added `server/models/DocumentVersion.js` — immutable version snapshots:
  - Stores base (original) and tailored versions for audit trail
  - Append-only: once created, versions are never modified
  - Tracks: title, type, generatedText, data, jobDescription, appliedSuggestions, versionNumber
  - Indexed by document + versionType for efficient lookup

### Tailoring Service
- Added `server/services/tailoringService.js` — structured suggestion engine:
  - **Structured suggestions**: each has section, action (add/update/remove), before, after, sourceFact, reasoning, confidence
  - **No opaque replacement**: returns individual reviewable changes, not a full document
  - **Prompt injection defense**: detects and redacts 12+ injection patterns ("ignore previous instructions", role-play, system/assistant markers, [INST] tags)
  - **Input bounds**: resume ≤20K chars, job description ≤10K chars, instruction ≤2K chars, max 20 suggestions per request
  - **AI timeout**: 30-second timeout prevents hung requests
  - **Diff computation**: simple line-by-line diff for before/after comparison
  - **Suggestion application**: applies accepted suggestions to create new document, skips stale ones (before text no longer matches)

### Tailoring API
- `POST /api/tailoring/suggest` — generate structured suggestions (rate-limited, uses AI)
  - Accepts documentId, jobDescription, jobTitle, jobCompany, instruction, provider, model
  - Saves base version snapshot on first call
  - Returns: `{ suggestions[], warnings[] }`
- `POST /api/tailoring/apply` — apply accepted suggestions
  - Creates new tailored document + version snapshot
  - Returns: `{ document, appliedCount, diff[] }`
- `GET /api/tailoring/versions/:documentId` — list all versions (base + tailored)
- `POST /api/tailoring/revert/:documentId` — revert document to a previous version

### Validation Schemas
- `tailoringRequestSchema` — validates suggest request (documentId, jobDescription required; max lengths enforced)
- `tailoringApplySchema` — validates apply request (documentId + suggestions array with id + accepted boolean)

### Tests
- `server/tailoringService.test.js` — 26 tests covering:
  - Prompt injection defense (12 patterns: ignore instructions, role-play, system markers, [INST] tags)
  - Input bounds (truncation to max lengths)
  - Suggestion application (accepted, rejected, stale, multiple, empty, null)
  - Diff computation (added, removed, changed, identical, empty inputs)
  - Constants validation (max lengths, max suggestions)

### Preserved Behavior
- Existing AI edit endpoint (editDocument) still works unchanged
- All existing tests still pass (152 server + 9 client)
- Client build still succeeds

## [Unreleased] — Milestone 4 Explainable Job Matching (2026-09-09)

### Job Normalizer
- Added `server/services/jobNormalizer.js` — standardized job shape across all 7 sources:
  - Canonical fields: source, sourceJobId, id, canonicalUrl, title, company, description, skills, location, country, workMode, employmentType, category, publishedAt, fetchedAt, expiresAt, applyUrl, salary, remote
  - `inferWorkMode()` — derives remote/hybrid/onsite from location text and remote flag
  - `inferEmploymentType()` — maps type strings to canonical values (full_time, part_time, contract, internship)
  - `computeExpiresAt()` — defaults to 30 days after publishedAt
  - `normalizeUrl()` — strips query params, fragments, trailing slashes for deduplication
  - `normalizeText()` — lowercases, strips parenthetical and special chars for title/company comparison

### Deduplication
- `deduplicateJobs(jobs)` — removes duplicates by three keys:
  1. Same source + sourceJobId (always a dupe)
  2. Same normalized URL (cross-source link to same posting)
  3. Same normalized title + company (same role reposted)
- Handles edge cases: empty URLs, empty titles, cross-source duplicates

### Server-Side Filtering, Pagination, Sorting
- `filterAndPaginate(jobs, params)` — full server-side pipeline:
  - Free-text search across title + company + description + location
  - Filters: workMode, employmentType, category, source
  - Sort: publishedAt (default), title, company — asc/desc
  - Pagination: 1-indexed page, 1-100 pageSize, returns total/totalPages
  - Staleness: excludes expired jobs by default (includeStale option)

### Explainable Match Engine
- Added `server/services/explainableMatcher.js` — wraps existing jobMatchingEngine with:
  - **Required vs preferred skills**: classifies skills using sentence-level context patterns ("must have", "required" → required; "nice to have", "preferred", "bonus" → preferred)
  - **Evidence tracking**: finds which resume section (skills/experience/projects/education/certifications) supports each matched skill
  - **Structured score components**: `{ skills, experience, education, eligibility, location, ats }` each with label, score, weight
  - **Deterministic scoring**: recomputes overall from components (no randomness)
  - **Score weights**: skills 35%, experience 25%, education 20%, eligibility 10%, location 5%, ATS 5%
  - **Disqualifier caps**: preserves existing caps for experience gap and low skill match
  - **Legacy compatibility**: returns all fields from the original engine

### Tests
- `server/jobNormalizer.test.js` — 41 tests covering:
  - Deduplication (same ID, cross-source URL, title+company, distinct jobs, empty input)
  - Staleness detection (past/future/null expiresAt)
  - Work mode inference (remote, hybrid, onsite, unknown)
  - Employment type inference (full_time, part_time, contract, internship)
  - URL normalization (lowercase, strip params, empty/null)
  - Text normalization (strip parenthetical, special chars)
  - Filtering (workMode, source, category, free-text search)
  - Pagination (page 1, page 2, empty input, invalid page, oversized pageSize)
  - Sorting (publishedAt desc, title asc)
  - Stale job inclusion/exclusion
  - computeExpiresAt (30-day default, empty input)
- `server/explainableMatcher.test.js` — 19 tests covering:
  - Skill classification (required, preferred, no context, must have, bonus patterns)
  - Evidence tracking (skills, experience, projects, certifications, missing skills, case-insensitive)
  - Explainable match (overall score, score components, required/preferred split, evidence, reasons, determinism, legacy fields, edge cases)

### Preserved Behavior
- Existing job search UI and API behavior unchanged
- Existing matching engine (jobMatchingEngine.js) untouched — explainableMatcher wraps it
- All existing tests still pass
- Client build still succeeds

## [Unreleased] — Milestone 3 ATS-Safe Export (2026-09-09)

### ATS Validation Engine
- Added `server/services/atsValidator.js` — validates resume text against ATS parsing rules:
  - **Section order**: detects sections via 35+ heading variants, warns if out of standard order
  - **Missing sections**: warns about missing contact, experience, education, skills
  - **Contact info**: checks for email and phone presence
  - **Dates**: detects date formats (MM/YYYY, Month YYYY, YYYY-Present, bare years)
  - **Suspicious formatting**: flags tabs, pipes, special bullets, dotted phone formats
  - **Length**: warns if resume is too short (<15 lines) or too long (>150 lines)
  - **ASCII ratio**: detects potential scanned/non-selectable text
  - Returns actionable warnings with severity (info/warning), not a pass/fail grade

### ATS-Safe Template Generator
- Added `server/services/atsTemplate.js` — deterministic, single-column output:
  - `generateATSHTML(profile)` — clean HTML with standard headings, no tables/columns
  - `generateATSPlainText(profile)` — plain text with standard section labels
  - Section order: Contact → Summary → Experience → Education → Skills → Projects → Certifications → Links
  - No graphics, no special characters, no column layouts — what ATS parsers can reliably read

### Plain-Text Preview
- Added `generatePlainTextPreview()` — normalizes heading case, adds section markers
- Shows users exactly what the ATS would "see" before downloading

### Export API
- `POST /api/export/ats-html` — generates ATS-safe HTML + plain-text + validation warnings
  - Accepts `documentId` (builds from Document data) or uses user's canonical profile
  - Returns `{ html, plainText, textPreview, validation }` in one call
- `POST /api/export/validate` — validates a document for ATS compatibility (warnings only)
  - Accepts `documentId` or raw `text`
- Both endpoints require authentication

### Tests
- `server/atsValidator.test.js` — 23 tests covering:
  - Well-structured resume passes with no warnings
  - Section detection and ordering
  - Contact information detection (email, phone)
  - Date detection (multiple formats, Present/Current)
  - Suspicious formatting detection (tabs, pipes, special bullets)
  - Missing sections warnings (experience, skills, education)
  - Length warnings (too short, too long)
  - Plain-text preview generation (heading standardization, underline, content preservation)
  - Edge cases (empty text, no sections)

### Preserved Behavior
- Existing client-side html2pdf.js export still works unchanged
- All existing tests still pass (66 server + 9 client)
- Client build still succeeds

## [Unreleased] — Milestone 2 Canonical Profile (2026-09-09)

### Canonical Profile Model
- Added `server/models/Profile.js` — Mongoose schema with structured sections:
  - `contact` (name, email, phone, location) with provenance
  - `summary` with provenance
  - `skills[]` — array of `{ name, provenance }` items
  - `experience[]` — `{ title, company, location, startDate, endDate, description, current, provenance }`
  - `education[]` — `{ degree, institution, location, startDate, endDate, gpa, description, provenance }`
  - `projects[]` — `{ title, description, url, technologies[], startDate, endDate, provenance }`
  - `certifications[]` — `{ name, issuer, date, expiryDate, credentialId, url, provenance }`
  - `links[]` — `{ label, url, provenance }`
  - `jobPreferences` — `{ desiredTitle, desiredSalary, workMode, locations[], openToRelocate, provenance }`
  - `suggestions[]` — pending AI suggestions (never auto-applied)
  - `importedFromDocument` — link to source Document
  - `status` — `"draft"` (imported, pending review) or `"canonical"` (confirmed source of truth)
- Every section item carries provenance: `{ source: "user"|"imported"|"ai_suggestion", verified: boolean, updatedAt: timestamp }`
- One profile per user (unique index on `user`)

### Profile API
- `GET /api/profile` — get or auto-create canonical profile
- `PUT /api/profile` — update canonical profile sections (rejected for draft status)
- `DELETE /api/profile` — delete profile
- `POST /api/profile/import` — import extracted resume fields into a draft profile
- `POST /api/profile/promote` — promote draft to canonical (review-and-confirm step)
- `POST /api/profile/suggestions/apply` — accept/reject an AI suggestion
- `POST /api/profile/suggestions/dismiss-all` — dismiss all pending suggestions

### Import-Review Flow
- Upload resume → extracted fields create a `draft` profile
- User reviews the draft (all imported items have `verified: false`)
- User calls `POST /api/profile/promote` to confirm → becomes `canonical`
- If canonical already exists, draft merges into it (verified data is never overwritten)

### AI Suggestion Guardrails
- AI suggestions live in a separate `suggestions[]` array — never auto-applied
- Accepting a suggestion moves it into the profile section with `source: "ai_suggestion"` and `verified: false`
- **Contact information is always user-only** — AI suggestions cannot modify contact fields
- **Verified facts are protected** — suggestions that would overwrite verified summary/experience are rejected with a clear error
- **Skills are additive** — AI can suggest new skills but never removes verified ones

### Validation Schemas
- `profileUpdateSchema` — validates all profile section updates with length limits
- `profileImportSchema` — validates import payload (requires documentId)
- `profileSuggestionActionSchema` — validates suggestion accept/reject
- `profilePromoteSchema` — validates promote request (no body needed)

### Tests
- `server/profile.test.js` — 31 tests covering:
  - Profile model schema structure and defaults
  - Provenance behavior (imported/user/ai_suggestion)
  - Import-review flow state transitions
  - All validation schemas (update, import, suggestion action)
  - Edge cases (empty skills, invalid workMode, oversized summary)

### Preserved Behavior
- Existing Document model and CRUD routes unchanged
- All existing tests still pass (66 server + 9 client)
- Client build still succeeds

## [Unreleased] — Milestone 1 Quality & Security (2026-09-09)

### Quality Foundation
- Added root `package.json` with monorepo scripts (lint, format, test, build, verify)
- Added ESLint 9 with flat config (`eslint.config.js`) — zero errors, zero warnings on modified files
- Added Prettier 3 with `.prettierrc` — consistent formatting across client and server
- Added Vitest 2 for client-side unit tests (9 tests in `aiModels.test.js`)
- Added Node.js built-in test runner for server-side tests (35 tests across 3 files)
- Added GitHub Actions CI pipeline (`.github/workflows/ci.yml`) — lint, test, build on Node 18/20

### Security Hardening
- **JSON body-size limit**: Express `json()` limited to 1MB (was unlimited)
- **Production startup checks**: Server exits with clear error if JWT_SECRET or MONGO_URI missing in production; JWT_SECRET must be ≥32 chars
- **Upload hardening**:
  - File extension validation via multer fileFilter (PDF/DOCX/TXT only)
  - MIME type validation (rejects unexpected content types)
  - File signature (magic bytes) validation for PDF (`%PDF`) and DOCX (PK ZIP header)
  - Safe temp file cleanup on all error paths (try/finally pattern)
  - Removed dead `escapeRegExp` and `FILE_SIGNATURES` code
- **AI provider/model allowlist**: Zod schemas now validate `provider` and `model` fields against known lists (`openai`, `experiential` / `gpt-4o-mini`, `gpt-6-astra`, `claude-fable-5.1`); rejects unknown values with clear error
- **Safe error responses**: Error handler no longer logs full stack traces in production; only logs error message
- **Validate middleware fix**: Fixed Zod v4 compatibility (`error.issues` instead of `error.errors`)

### Tests Added
- `server/validation.test.js` — 15 tests for Zod schema validation (signup, login, document, AI edit, analysis, compare)
- `server/skillDatabase.test.js` — 10 tests for unified skill matcher (case insensitivity, substring prevention, DBA skills, short-token rejection)
- `server/security.test.js` — 10 tests for security scenarios (AI allowlist, input validation, prototype pollution, SQL/XSS injection)
- `client/src/utils/aiModels.test.js` — 9 tests for client AI model selection (defaults, fallbacks, value format)

## [Unreleased] — Milestone 0 Baseline (2026-09-09)

### Baseline Inspection
- Full codebase audit: 15 client pages, 9 server models, 9 route files, 8 controllers, 18 services
- Client build verified: Vite builds clean (exit 0), ~392KB gzipped
- Server modules verified: all 8 route modules + controller imports load cleanly
- No existing tests, no README, no CHANGELOG, no linting, no CI

### Documentation
- Added `README.md` — setup, environment variables, architecture, API reference, known limitations
- Added `CHANGELOG.md` — this file

### Known Issues Identified
- No unit or integration tests anywhere in the codebase
- No ESLint/Prettier configuration
- No CI/CD pipeline
- Upload route validates only file extension, not MIME type or file signature
- No JSON body-size limit beyond multer's 5MB file limit
- Application status transitions are not enforced
- No structured profile model (Document.data is untyped)
- No ATS export validation
- `server/services/Untitled-1.py` — stray Python file in services directory
- Client bundle ~392KB gzipped (no code splitting)

### Previously Implemented (prior threads)
- OpenRouter/Experiential Labs integration with Claude Fable 5.1 + GPT-6 Astra
- Resume + JD analysis with deterministic match + qualitative LLM layer
- Model comparison view (two AI models side-by-side)
- Resume upload (PDF/DOCX/TXT) with section-aware extraction
- Skill database unification (single source of truth in `skillDatabase.js`)
- PDF header/footer cleanup for extracted text
- Multiple resume + CV templates (10 total)
- 7-source worldwide job search with country directory
- Source filter checkboxes (wired end-to-end)
- Auth hardening (auth-loading state, return-to-intent, race-condition fix)
- Default model fix (Claude Fable 5.1 as default instead of dead OpenAI key)
- Himalayas epoch-date fix
- Compare dimension row rendering fix
- Async document auto-select fix (3 pages)
