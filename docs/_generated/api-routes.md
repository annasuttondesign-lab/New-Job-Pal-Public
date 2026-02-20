# API Routes Inventory

> **Auto-generated** — Do not edit manually.
> Run `npm run gen:api-routes` to regenerate.
> Generated: 2026-02-20

**Total routes: 41**

## Profile & Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile` | Get profile |
| POST | `/api/profile` | Create/process profile |
| POST | `/api/settings/api-key` | Create/process api key |
| GET | `/api/settings/export` | Get export |
| POST | `/api/settings/import` | Create/process import |

## Resumes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/resume/parse` | Create/process parse |
| POST | `/api/resume/tailor` | Create/process tailor |
| GET | `/api/resumes` | Get resumes |
| GET | `/api/resumes/:jobId` | Get jobId |

## Jobs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | Get jobs |
| POST | `/api/jobs` | Create/process jobs |
| PUT | `/api/jobs/:id` | Update id |
| DELETE | `/api/jobs/:id` | Delete id |
| PUT | `/api/jobs/:id/star` | Update star |
| POST | `/api/jobs/extract-url` | Create/process extract url |
| POST | `/api/jobs/:id/match` | Create/process match |
| POST | `/api/headhunter/search` | Create/process search |
| GET | `/api/jobs/:jobId/mock-interviews` | Get mock interviews |
| POST | `/api/jobs/:jobId/mock-interview/start` | Create/process start |
| POST | `/api/jobs/:jobId/mock-interview/:id/respond` | Create/process respond |
| POST | `/api/jobs/:jobId/mock-interview/:id/end` | Create/process end |

## Cover Letters

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cover-letter/generate` | Create/process generate |
| GET | `/api/cover-letters` | Get cover letters |
| GET | `/api/cover-letters/:jobId` | Get jobId |

## Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Create/process chat |

## Custom Boards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/custom-boards` | Get custom boards |
| POST | `/api/custom-boards` | Create/process custom boards |
| DELETE | `/api/custom-boards/:id` | Delete id |

## Writing Samples

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/writing-samples` | Get writing samples |
| POST | `/api/writing-samples` | Create/process writing samples |
| DELETE | `/api/writing-samples/:id` | Delete id |

## Templates & Documents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | Get templates |
| POST | `/api/templates/upload` | Create/process upload |
| DELETE | `/api/templates/:id` | Delete id |
| GET | `/api/generated/:id/download` | Get download |

## Contacts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/contacts` | Get contacts |
| POST | `/api/contacts` | Create/process contacts |
| PUT | `/api/contacts/:id` | Update id |
| DELETE | `/api/contacts/:id` | Delete id |
| POST | `/api/contacts/:id/notes` | Create/process notes |
| DELETE | `/api/contacts/:id/notes/:noteId` | Delete noteId |

