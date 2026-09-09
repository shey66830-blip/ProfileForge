# ProfileForge

AI-powered resume builder, job matcher, and career platform. Create resumes and CVs, match against real job listings, get AI-assisted tailoring, and track applications — all in one place.

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone and install

```bash
git clone https://github.com/shey66830-blip/ProfileForge.git
cd ProfileForge

# Server
cd server && cp .env.example .env  # then fill in values
npm install

# Client
cd ../client && npm install
```

### 2. Configure environment

Copy `server/.env.example` to `server/.env` and fill in the required values (see Environment Variables below).

### 3. Run

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

Open http://localhost:5175

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `PORT` | No | Server port (default 5000) |
| `NODE_ENV` | No | `production` enables secure cookies |
| `CLIENT_URL` | No | Frontend URL for CORS and OAuth redirects |
| **AI Providers** | | |
| `EXPERIENTIAL_API_KEY` | No | Experiential Labs API key (primary AI provider) |
| `OPENROUTER_API_KEY` | No | Alternative key for Experiential Labs gateway |
| `OPENAI_API_KEY` | No | Direct OpenAI key (legacy, not required) |
| **OAuth** | | |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Google OAuth credentials |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | No | GitHub OAuth credentials |
| **Job Search** | | |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | No | Adzuna job API credentials |
| `JSEARCH_API_KEY` | No | JSearch (RapidAPI) key |
| `JOOBLE_API_KEY` | No | Jooble API key |
| `MAX_JOBS` | No | Max jobs per search (default 150) |
| `JOBSEARCH_PAGES` | No | JSearch pages to fetch (default 2) |
| **Payments** | | |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Razorpay payment gateway |

## Architecture

```
client/                 React + Vite SPA
├── src/
│   ├── pages/          15 route pages
│   ├── components/     Shared UI components
│   ├── services/       API client layer (one per domain)
│   ├── utils/          Shared helpers (aiModels, generators, matchers, validators)
│   ├── context/        Theme + Toast providers
│   └── styles/         Global CSS (dark/light via data-theme)

server/                 Express 5 + Mongoose 9
├── config/             DB connection, Passport strategies
├── middleware/          Auth, validation (Zod), rate limiting, plan limits, error handler
├── models/             9 Mongoose schemas
├── controllers/        Route handlers (one per domain)
├── routes/             Express routers (one per domain)
├── services/           Business logic (AI, matching, extraction, job fetching)
└── utils/              Token generation, text cleaning
```

### API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register (name, username, email, password) |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/auth/me` | Yes | Current user profile |
| PUT | `/api/auth/update-profile` | Yes | Update name/username |
| GET | `/api/auth/google` | No | Google OAuth initiation |
| GET | `/api/auth/github` | No | GitHub OAuth initiation |
| POST | `/api/documents` | Yes | Create resume/CV/biodata |
| GET | `/api/documents` | Yes | List user's documents |
| GET | `/api/documents/:id` | Yes | Get single document |
| PUT | `/api/documents/:id` | Yes | Update document |
| DELETE | `/api/documents/:id` | Yes | Delete document |
| POST | `/api/upload/resume` | Yes | Upload PDF/DOCX/TXT resume |
| POST | `/api/ai/edit-document` | Yes | AI-improve a document |
| POST | `/api/ai/analyze-resume` | Yes | Analyze resume structure + ATS |
| POST | `/api/ai/analyze-resume-job` | Yes | Resume vs job analysis (deterministic + LLM) |
| POST | `/api/ai/compare-resume-job` | Yes | Compare two AI models on same resume+JD |
| POST | `/api/ai/generate-cover-letter` | Yes | AI cover letter generation |
| GET | `/api/jobs` | Yes | Search remote jobs (multi-source) |
| POST | `/api/saved-jobs` | Yes | Save a job |
| GET | `/api/saved-jobs` | Yes | List saved jobs |
| DELETE | `/api/saved-jobs/:jobId` | Yes | Unsave a job |
| GET | `/api/saved-jobs/check/:jobId` | Yes | Check if job is saved |
| POST | `/api/applications` | Yes | Create/update application |
| GET | `/api/applications` | Yes | List applications |
| PUT | `/api/applications/:id` | Yes | Update application status/notes |
| DELETE | `/api/applications/:id` | Yes | Delete application |
| POST | `/api/payment/create-order` | Yes | Create Razorpay order |
| POST | `/api/payment/verify` | Yes | Verify Razorpay payment |
| GET | `/api/payment/premium-status` | Yes | Check plan status |
| GET | `/api/payment/usage` | Yes | Get feature usage counts |
| POST | `/api/payment/mock-test` | Yes | Mock payment (dev only) |
| GET | `/api/courses` | Yes | Browse courses |
| GET | `/api/certifications` | Yes | Browse certifications |
| GET | `/api/health` | No | Server health check |

### Data Models

- **User** — name, username, email, password (hashed), plan (free/premium/pro), OAuth IDs, avatar
- **Document** — user ref, type (resume/cv/biodata), title, data (structured), generatedText
- **Application** — user ref, jobId, jobTitle, company, status, appliedAt, notes
- **SavedJob** — user ref, jobId, jobData, source
- **Usage** — user ref, daily counters for AI edits, PDF exports, tailoring, cover letters
- **Payment** — Razorpay transaction records
- **Course** — provider-sourced course catalog
- **Enrollment** — user-course enrollment with progress
- **Certification** — certification catalog with study resources

## Plans & Limits

| Feature | Free | Premium | Pro |
|---|---|---|---|
| AI edits/day | 3 | 50 | Unlimited |
| PDF exports/day | 5 | Unlimited | Unlimited |
| Tailoring/day | 0 | 10 | Unlimited |
| Cover letters/day | 2 | 20 | Unlimited |

## Job Sources

The job search aggregates from multiple free and API-based sources:
- **Remotive** — remote tech jobs (free, no key)
- **Adzuna** — worldwide jobs by country (requires API key)
- **Jobicy** — remote jobs (free, no key)
- **Himalayas** — remote jobs (free, no key)
- **Arbeitnow** — remote jobs (free, no key)
- **JSearch** — Google Jobs via RapidAPI (requires subscription)
- **Jooble** — worldwide jobs (optional, requires key)

Country-specific filtering is supported via a 200+ country directory with aliases and ISO codes.

## Known Limitations

1. **AI provider keys** — Experiential Labs (primary) requires credits/payment for LLM calls. The deterministic matching and resume analysis work without any keys; only the qualitative LLM layer needs a live key.
2. **No tests yet** — Unit and integration tests are planned for Milestone 1.
3. **No CI/CD** — GitHub Actions pipeline is planned for Milestone 1.
4. **Application status transitions** — Not yet enforced; any status can be set to any other.
5. **No ATS export validation** — Export generates PDF but doesn't validate ATS-friendliness (planned for Milestone 3).
6. **No structured profile** — Profile data is stored in Document.data as untyped object (planned for Milestone 2).
7. **Bundle size** — Client bundle is ~392KB gzipped; code splitting not yet implemented.
8. **File uploads** — Limited to 5MB; MIME validation is extension-only (planned for Milestone 1).
9. **DOCX resume parsing** — Basic raw text extraction via mammoth; no table/layout awareness.

## License

ISC
