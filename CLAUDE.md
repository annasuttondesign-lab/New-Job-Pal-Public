# New Job Pal — Claude Code Project Rules

## Project Overview

New Job Pal is a Node.js/Express application that helps job seekers manage their search. It uses JSON files for data storage, the Anthropic Claude API for AI features, and vanilla JavaScript on the frontend.

## Tech Stack

- Backend: Node.js + Express (CommonJS — no "type" field in package.json)
- Frontend: Vanilla JS (ES modules in browser) + HTML/CSS
- Data: JSON files in data/ directory (auto-created by ensureDataFiles())
- AI: Anthropic Claude SDK (@anthropic-ai/sdk)
- Document generation: docxtemplater + pizzip
- File uploads: multer
- PDF parsing: pdf-parse
- IDs: uuid

## Architecture

- **server.js** — All backend logic: Express routes, middleware, AI integration, file I/O (monolith)
- **public/index.html** — Single-page app shell
- **public/js/app.js** — All frontend logic: state management, API calls, DOM manipulation
- **public/css/styles.css** — All styles
- **data/*.json** — Persistent storage (gitignored)
- **data/templates/** — Document templates for docxtemplater
- **data/generated/** — Generated DOCX files (gitignored)
- **start-here.html** — Self-contained beginner setup guide (matches app design system)
- **README.md** — GitHub landing page with quick-start and feature overview
- **LICENSE** — MIT license

## Documentation Maintenance — Standing Instructions

Whenever you modify code, check this table and update the corresponding documentation:

| If You Changed… | Update This | Run This Command |
|-----------------|------------|-----------------|
| server.js (any route handler — app.get/post/put/delete) | API route inventory | `npm run gen:api-routes` |
| server.js (data file reads/writes, ensureDataFiles, JSON structure) | Data model inventory | `npm run gen:models` |
| .env or .env.example | Environment variable inventory | `npm run gen:env` |
| server.js (added new process.env reference) | Environment variable inventory | `npm run gen:env` |
| public/js/app.js (UI sections, navigation, API calls) | docs/frontend-notes.md | (manual update) |
| public/index.html (new sections, modals, structural changes) | docs/frontend-notes.md | (manual update) |
| public/css/styles.css (major theme or layout changes) | docs/frontend-notes.md | (manual update) |
| package.json (new dependency added) | This file (Tech Stack section) | (manual update) |
| Any structural change (new files, new folders, renamed files) | This file (Architecture section) | (manual update) |

**After making code changes, always run `npm run gen:all` to regenerate all inventories.**

## Important Conventions

- All API routes are in server.js (monolith — no route splitting yet)
- Data files live in data/*.json and are auto-created by ensureDataFiles()
- UUIDs are generated with the uuid package for all record IDs
- The frontend uses fetch() to call the API, wrapped in an apiCall() helper
- File uploads use multer middleware (configured for memory storage)
- AI features use the Anthropic SDK with claude-sonnet-4-20250514 model
- Error responses follow the pattern: res.status(code).json({ error: 'message' })

## Data Files

| File | Purpose |
|------|---------|
| data/profile.json | User profile (name, skills, experience, education) |
| data/jobs.json | Saved job listings |
| data/resumes.json | AI-tailored resumes per job |
| data/cover-letters.json | AI-generated cover letters per job |
| data/contacts.json | Networking contacts |
| data/writing-samples.json | User's writing samples |
| data/custom-boards.json | Custom job search board links |
| data/mock-interviews.json | Mock interview conversations |
| data/document-templates.json | Uploaded document templates metadata |
