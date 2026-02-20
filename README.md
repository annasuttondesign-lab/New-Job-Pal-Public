# New Job Pal

A personal job search companion powered by AI. Track applications, generate tailored resumes and cover letters, practice mock interviews, and organize your entire job hunt in one place.

**New to coding?** Open [`start-here.html`](start-here.html) in your browser for a friendly, step-by-step setup guide.

## Features

- **Job Tracker** — Save listings, track status (bookmarked, applied, interviewing, etc.), star favorites
- **AI Match Analysis** — See how your skills align with a job's requirements, with actionable gap recommendations
- **Resume Generator** — AI-tailored resumes for each job, with DOCX export via custom templates
- **Cover Letter Generator** — Personalized cover letters that reference your writing style
- **Mock Interviews** — Practice with an AI interviewer and get scored feedback
- **Job Scout** — AI-powered search strategy: suggested queries, target companies, and curated board links
- **Writing Samples** — Upload samples so the AI can match your voice
- **Contacts & Networking** — Track contacts, link them to jobs, keep timestamped notes
- **Document Templates** — Upload your own DOCX templates for resume and cover letter generation
- **Profile** — Store your skills, experience, and education once; the AI uses it everywhere

## Quick Start

```bash
git clone https://github.com/annasuttondesign-lab/New-Job-Pal-Public.git
cd New-Job-Pal-Public
npm install
```

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=your-api-key-here
PORT=3000
```

Then start the server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Getting an API Key

This app uses the Anthropic Claude API. To get a key:

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Generate an API key under **Settings > API Keys**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Vanilla JS + HTML/CSS |
| Data | JSON files (auto-created on first run) |
| AI | Anthropic Claude API |
| Documents | docxtemplater + pizzip |
| File uploads | multer |
| PDF parsing | pdf-parse |

## Project Structure

```
server.js              All backend logic (Express routes, AI, file I/O)
public/
  index.html           Single-page app shell
  js/app.js            Frontend logic (state, API calls, DOM)
  css/styles.css        Styles (Artist's Sketchbook design system)
data/                  JSON storage (auto-created, gitignored)
  templates/           DOCX templates for document generation
docs/                  Auto-generated documentation inventories
start-here.html        Beginner-friendly setup guide
```

## License

[MIT](LICENSE)
