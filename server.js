const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// ---------------------------------------------------------------------------
// Environment / API Key
// ---------------------------------------------------------------------------

// Attempt to load .env file manually (no dotenv dependency)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContents = fs.readFileSync(envPath, 'utf-8');
  envContents.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.warn(
    'WARNING: ANTHROPIC_API_KEY is not set. AI features will not work.\n' +
    'Set it via environment variable or add it to a .env file in the project root.'
  );
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Multer for file uploads (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------------------------------
// Data directory & persistence helpers
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(__dirname, 'data');

const DATA_DEFAULTS = {
  'profile.json': {
    name: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    links: []
  },
  'jobs.json': [],
  'resumes.json': [],
  'cover-letters.json': [],
  'writing-samples.json': [],
  'document-templates.json': [],
  'contacts.json': [],
  'mock-interviews.json': [],
  'custom-boards.json': []
};

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  // Ensure subdirectories for templates and generated docs
  const templatesDir = path.join(DATA_DIR, 'templates');
  const generatedDir = path.join(DATA_DIR, 'generated');
  if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir, { recursive: true });
  if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir, { recursive: true });

  for (const [filename, defaultData] of Object.entries(DATA_DEFAULTS)) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  }
}

function loadData(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    const defaultData = DATA_DEFAULTS[filename];
    if (defaultData !== undefined) {
      return JSON.parse(JSON.stringify(defaultData));
    }
    return null;
  }
}

function saveData(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Claude AI helper
// ---------------------------------------------------------------------------

async function callClaude(systemPrompt, userMessage) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage }
    ]
  });
  // Extract text from the response content blocks
  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  return text;
}

// ---------------------------------------------------------------------------
// ROUTES: Profile
// ---------------------------------------------------------------------------

app.get('/api/profile', (req, res) => {
  try {
    const profile = loadData('profile.json');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile', details: err.message });
  }
});

app.post('/api/profile', (req, res) => {
  try {
    const profile = req.body;
    saveData('profile.json', profile);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save profile', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Settings
// ---------------------------------------------------------------------------

app.post('/api/settings/api-key', (req, res) => {
  try {
    const { key } = req.body;
    if (!key || !key.trim()) {
      return res.status(400).json({ error: 'No API key provided' });
    }

    // Update the .env file
    const envFilePath = path.join(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envFilePath)) {
      envContent = fs.readFileSync(envFilePath, 'utf-8');
    }

    // Replace or add ANTHROPIC_API_KEY
    const lines = envContent.split('\n');
    let found = false;
    const updatedLines = lines.map((line) => {
      if (line.trim().startsWith('ANTHROPIC_API_KEY=')) {
        found = true;
        return `ANTHROPIC_API_KEY=${key.trim()}`;
      }
      return line;
    });
    if (!found) {
      updatedLines.push(`ANTHROPIC_API_KEY=${key.trim()}`);
    }
    fs.writeFileSync(envFilePath, updatedLines.join('\n'), 'utf-8');

    // Update the in-memory client
    process.env.ANTHROPIC_API_KEY = key.trim();
    client.apiKey = key.trim();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update API key', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Resume Upload & Parse
// ---------------------------------------------------------------------------

app.post('/api/resume/parse', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract text based on file type
    const mimetype = req.file.mimetype || '';
    const filename = (req.file.originalname || '').toLowerCase();
    let text = '';

    if (mimetype === 'application/pdf' || filename.endsWith('.pdf')) {
      // Parse PDF
      try {
        const pdfData = await pdfParse(req.file.buffer);
        text = pdfData.text || '';
      } catch (pdfErr) {
        return res.status(400).json({ error: 'Could not read this PDF. It may be scanned/image-based. Try a .txt file or paste your resume instead.' });
      }
    } else {
      // Treat as plain text (.txt, .doc, .docx fallback)
      text = req.file.buffer.toString('utf-8');
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'File appears to be empty or unreadable. Please use a .txt file or paste your resume content.' });
    }

    const systemPrompt = `You are a strict resume parser. Extract structured data ONLY from the exact text provided below.

CRITICAL RULES:
- ONLY include information that is EXPLICITLY written in the resume text.
- NEVER invent, guess, or infer information that is not directly stated.
- NEVER use your knowledge of real people, companies, or the internet to fill in details.
- If a field is not present in the text, use an empty string "" or empty array [].
- Do NOT generate or write a summary if one is not in the resume — use "".
- Only include skills that are explicitly listed or clearly stated as skills in the text.
- For dates, only use what is written. If no date is given, use "".
- For experience descriptions, only use text directly from the resume. Do not rewrite or embellish.

Return ONLY valid JSON with no markdown fencing, no explanation — just the JSON object.

JSON schema:
{
  "name": "string - full name, or empty string if not found",
  "email": "string - email address, or empty string if not found",
  "phone": "string - phone number, or empty string if not found",
  "location": "string - location as written, or empty string if not found",
  "title": "string - most recent job title as written, or empty string",
  "summary": "string - professional summary ONLY if one is explicitly written in the resume, otherwise empty string",
  "skills": ["array of skills ONLY if explicitly listed in the resume"],
  "experience": [
    {
      "company": "string - company name as written",
      "title": "string - job title as written",
      "startDate": "string - start date as written or in YYYY-MM format, or empty string",
      "endDate": "string - end date as written or in YYYY-MM format, or empty string if current/present",
      "current": false,
      "description": "string - description text directly from the resume",
      "fields": ["array of industry/field tags based on the role, e.g. tech, marketing, design"]
    }
  ],
  "education": [
    {
      "institution": "string - school name as written",
      "degree": "string - degree as written",
      "field": "string - field of study as written",
      "year": "string - graduation year as written"
    }
  ],
  "certifications": ["array of certifications ONLY if explicitly mentioned"],
  "links": {
    "linkedin": "string - LinkedIn URL ONLY if written in resume",
    "portfolio": "string - portfolio URL ONLY if written in resume",
    "github": "string - GitHub URL ONLY if written in resume"
  }
}

For experience entries, set "current" to true ONLY if the resume says "Present", "Current", or similar.`;

    // Log extracted text for debugging (first 500 chars)
    console.log(`[Resume Parse] File: ${req.file.originalname}, Size: ${req.file.size} bytes, Extracted text length: ${text.length} chars`);
    console.log(`[Resume Parse] First 500 chars: ${text.substring(0, 500)}`);

    const result = await callClaude(systemPrompt, text);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({
        error: 'Failed to parse Claude response as JSON',
        raw: result
      });
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse resume', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Jobs (CRUD)
// ---------------------------------------------------------------------------

app.get('/api/jobs', (req, res) => {
  try {
    const jobs = loadData('jobs.json');
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load jobs', details: err.message });
  }
});

app.post('/api/jobs', (req, res) => {
  try {
    const jobs = loadData('jobs.json');
    const newJob = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    jobs.push(newJob);
    saveData('jobs.json', jobs);
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add job', details: err.message });
  }
});

app.put('/api/jobs/:id', (req, res) => {
  try {
    const jobs = loadData('jobs.json');
    const index = jobs.findIndex((j) => j.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }
    jobs[index] = {
      ...jobs[index],
      ...req.body,
      id: jobs[index].id, // prevent id overwrite
      updatedAt: new Date().toISOString()
    };
    saveData('jobs.json', jobs);
    res.json(jobs[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job', details: err.message });
  }
});

app.delete('/api/jobs/:id', (req, res) => {
  try {
    let jobs = loadData('jobs.json');
    const initialLength = jobs.length;
    jobs = jobs.filter((j) => j.id !== req.params.id);
    if (jobs.length === initialLength) {
      return res.status(404).json({ error: 'Job not found' });
    }
    saveData('jobs.json', jobs);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete job', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Jobs — Star/Favorite Toggle
// ---------------------------------------------------------------------------

app.put('/api/jobs/:id/star', (req, res) => {
  try {
    const jobs = loadData('jobs.json');
    const index = jobs.findIndex((j) => j.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Job not found' });
    }
    jobs[index].starred = !jobs[index].starred;
    jobs[index].updatedAt = new Date().toISOString();
    saveData('jobs.json', jobs);
    res.json(jobs[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle star', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: AI — Extract Job from URL
// ---------------------------------------------------------------------------

app.post('/api/jobs/extract-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'No URL provided' });
    }

    // Fetch the page content
    let pageText = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url.trim(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobPal/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(400).json({ error: `Could not fetch URL (HTTP ${response.status}). The site may block automated requests. Try using Manual Add instead.` });
      }

      const html = await response.text();

      // Strip HTML tags and extract visible text content
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

      // Truncate to avoid token limits (keep first ~8000 chars)
      if (pageText.length > 8000) {
        pageText = pageText.substring(0, 8000);
      }
    } catch (fetchErr) {
      if (fetchErr.name === 'AbortError') {
        return res.status(400).json({ error: 'Request timed out. The site may be slow or blocking requests. Try Manual Add instead.' });
      }
      return res.status(400).json({ error: `Could not fetch URL: ${fetchErr.message}. Try using Manual Add instead.` });
    }

    if (!pageText || pageText.length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful content from the URL. The page may require login or use JavaScript rendering. Try using Manual Add instead.' });
    }

    const systemPrompt = `You are a job listing parser. Extract structured data from the raw text of a job posting webpage.

Return ONLY valid JSON with no markdown fencing, no explanation — just the JSON object.

The JSON schema:
{
  "title": "string - job title",
  "company": "string - company name",
  "location": "string - location or Remote",
  "type": "string - Full-time, Part-time, Contract, etc.",
  "salaryMin": null or number - minimum pay (hourly rate or annual salary, just the number),
  "salaryMax": null or number - maximum pay (hourly rate or annual salary, just the number),
  "salaryType": "string - 'hourly' or 'annual' or empty string if unknown",
  "description": "string - the full job description text (preserve detail, include responsibilities)",
  "requirements": ["array of key requirements/qualifications"],
  "niceToHave": ["array of preferred/nice-to-have qualifications"],
  "field": "string - industry or field (e.g. Technology, Healthcare, Finance)",
  "applicationUrl": "string - application URL if found, otherwise empty string"
}

IMPORTANT:
- For salary fields, extract numeric values only (no $ signs or formatting). If the posting says "$50-75/hr", set salaryMin: 50, salaryMax: 75, salaryType: "hourly".
- If the posting says "$80,000 - $120,000", set salaryMin: 80000, salaryMax: 120000, salaryType: "annual".
- If no salary is mentioned, set salaryMin: null, salaryMax: null, salaryType: "".
- For the description, include the full job description — responsibilities, about the role, etc. Not just a summary.
- If a field cannot be determined from the text, use a reasonable empty default.`;

    const result = await callClaude(systemPrompt, `Source URL: ${url}\n\nPage content:\n${pageText}`);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({
        error: 'Failed to parse the job listing. Try using Manual Add instead.',
        raw: result
      });
    }

    // Include the source URL
    parsed.url = url.trim();

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract job from URL', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: AI — Match Analysis
// ---------------------------------------------------------------------------

app.post('/api/jobs/:id/match', async (req, res) => {
  try {
    const jobs = loadData('jobs.json');
    const job = jobs.find((j) => j.id === req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const profile = loadData('profile.json');

    const systemPrompt = `You are a career matching analyst. Compare a candidate's profile against a job listing and produce a detailed match analysis.
Return ONLY valid JSON with no markdown fencing.

JSON schema:
{
  "matchScore": number (0-100),
  "matchingSkills": ["skills the candidate has that match the job"],
  "missingSkills": ["skills the job requires that the candidate lacks"],
  "transferableSkills": ["skills the candidate has that could transfer to fill gaps"],
  "relevantExperience": [
    {
      "role": "string",
      "company": "string",
      "relevance": "string - brief explanation of why this experience is relevant"
    }
  ],
  "recommendations": ["actionable suggestions for improving candidacy"],
  "summary": "string - 2-3 sentence overall assessment"
}`;

    const userMessage = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Job Listing
${JSON.stringify(job, null, 2)}`;

    const result = await callClaude(systemPrompt, userMessage);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({
        error: 'Failed to parse match analysis',
        raw: result
      });
    }

    // Persist matchScore to the job record
    const score = parsed.matchScore ?? parsed.score ?? null;
    if (score != null) {
      job.matchScore = score;
      job.updatedAt = new Date().toISOString();
      saveData('jobs.json', jobs);
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate match analysis', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: AI — Tailor Resume
// ---------------------------------------------------------------------------

app.post('/api/resume/tailor', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const jobs = loadData('jobs.json');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const profile = loadData('profile.json');
    const writingSamples = loadData('writing-samples.json');

    const systemPrompt = `You are an expert resume writer and ATS optimization specialist.
Given a candidate's profile, a target job listing, and writing samples for voice reference, create a tailored resume.

Your goals:
1. Select ONLY the most relevant work experience for this specific job and field (2-4 roles max).
2. Reword descriptions to naturally incorporate keywords from the job listing.
3. Optimize formatting and language for ATS (Applicant Tracking System) scanning.
4. Maintain authenticity to the candidate's real voice — use the writing samples as a style guide.
5. Keep it concise: aim for a strong 1-2 page resume.
6. For skills, select ONLY skills the candidate actually has that directly match the job description.

Return ONLY valid JSON with no markdown fencing:
{
  "resume": "string - the full formatted resume text (use newlines for formatting)",
  "summary": "string - 2-3 sentence tailored professional summary matching the job description",
  "skills": {
    "management": ["array of up to 6 management/leadership skills matching the JD"],
    "design": ["array of up to 6 design/creative skills matching the JD"],
    "tools": ["array of up to 6 tools/software skills matching the JD"]
  },
  "experiences": [
    {
      "title": "Job Title exactly as it should appear",
      "company": "Company Name",
      "location": "City, State",
      "dates": "Start Year – End Year or Present",
      "bullets": ["array of 2-4 achievement bullets tailored to the JD, starting with action verbs"]
    }
  ],
  "changes": ["array of strings describing each tailoring change you made"],
  "highlights": ["key strengths emphasized for this particular role"],
  "atsKeywords": ["keywords from the job listing that were incorporated"]
}

IMPORTANT for the structured fields:
- Include 2-4 experiences maximum, ordered by relevance to the job.
- Each experience should have 2-4 bullet points.
- For skills, categorize into management, design/creative, and tools. Use up to 6 per category.
- The "resume" field should still contain the full formatted text version.`;

    const userMessage = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Target Job
${JSON.stringify(job, null, 2)}

## Writing Samples (for voice/tone reference)
${writingSamples.length > 0 ? writingSamples.map((s) => `### ${s.title} (${s.type})\n${s.content}`).join('\n\n') : 'No writing samples provided.'}`;

    const result = await callClaude(systemPrompt, userMessage);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({
        error: 'Failed to parse tailored resume',
        raw: result
      });
    }

    // Save the tailored resume
    const resumes = loadData('resumes.json');
    const existing = resumes.findIndex((r) => r.jobId === jobId);
    const resumeEntry = {
      id: existing >= 0 ? resumes[existing].id : uuidv4(),
      jobId,
      jobTitle: job.title || '',
      company: job.company || '',
      ...parsed,
      createdAt: existing >= 0 ? resumes[existing].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Try to generate .docx from template — pass structured data for rich templates
    const templateData = {
      // Header fields
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      location: profile.location || '',
      title: profile.title || '',
      website: profile.links?.portfolio || profile.links?.linkedin || '',
      company: job.company || '',
      job_title: job.title || '',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      resume_content: parsed.resume || '',
      // Structured summary
      summary: parsed.summary || '',
    };

    // Map skills arrays to numbered fields (mgmt_1 through mgmt_6, etc.)
    const skillCategories = { management: 'mgmt', design: 'design', tools: 'tools' };
    for (const [category, prefix] of Object.entries(skillCategories)) {
      const skills = parsed.skills?.[category] || [];
      for (let i = 1; i <= 6; i++) {
        templateData[`${prefix}_${i}`] = skills[i - 1] || '';
      }
    }

    // Map experiences to numbered fields (exp1_title, exp1_bullet1, etc.)
    const experiences = parsed.experiences || [];
    const bulletCounts = [4, 3, 3, 2]; // max bullets per experience slot
    for (let e = 1; e <= 4; e++) {
      const exp = experiences[e - 1] || {};
      templateData[`exp${e}_title`] = exp.title || '';
      templateData[`exp${e}_company`] = exp.company || '';
      templateData[`exp${e}_location`] = exp.location || '';
      templateData[`exp${e}_dates`] = exp.dates || '';
      const bullets = exp.bullets || [];
      for (let b = 1; b <= bulletCounts[e - 1]; b++) {
        templateData[`exp${e}_bullet${b}`] = bullets[b - 1] || '';
      }
    }

    const docxFilename = generateDocx('resume', templateData);
    if (docxFilename) {
      resumeEntry.docxPath = docxFilename;
    }

    if (existing >= 0) {
      resumes[existing] = resumeEntry;
    } else {
      resumes.push(resumeEntry);
    }
    saveData('resumes.json', resumes);

    res.json(resumeEntry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to tailor resume', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: AI — Generate Cover Letter
// ---------------------------------------------------------------------------

app.post('/api/cover-letter/generate', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const jobs = loadData('jobs.json');
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const profile = loadData('profile.json');
    const writingSamples = loadData('writing-samples.json');

    const systemPrompt = `You are an expert cover letter writer.
Given a candidate's profile, a target job, and their writing samples, write a compelling cover letter.

Guidelines:
1. Analyze the writing samples to capture the candidate's authentic voice and tone.
2. Highlight the most relevant experience and skills for THIS specific job.
3. Be professional but genuine — avoid generic corporate-speak.
4. Show specific knowledge of the company and role.
5. Keep it concise — 3-4 strong paragraphs.
6. Include a compelling opening that isn't "I am writing to apply for..."

Return ONLY valid JSON with no markdown fencing:
{
  "coverLetter": "string - the full cover letter text",
  "toneNotes": "string - brief description of the voice/tone used and how it matches the candidate's style",
  "keyPoints": ["main selling points highlighted in the letter"]
}`;

    const userMessage = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Target Job
${JSON.stringify(job, null, 2)}

## Writing Samples (for voice/tone reference)
${writingSamples.length > 0 ? writingSamples.map((s) => `### ${s.title} (${s.type})\n${s.content}`).join('\n\n') : 'No writing samples provided — use a warm, professional, and authentic tone.'}`;

    const result = await callClaude(systemPrompt, userMessage);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({
        error: 'Failed to parse cover letter',
        raw: result
      });
    }

    // Save the cover letter
    const coverLetters = loadData('cover-letters.json');
    const existing = coverLetters.findIndex((cl) => cl.jobId === jobId);
    const clEntry = {
      id: existing >= 0 ? coverLetters[existing].id : uuidv4(),
      jobId,
      jobTitle: job.title || '',
      company: job.company || '',
      ...parsed,
      createdAt: existing >= 0 ? coverLetters[existing].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Try to generate .docx from template
    const docxFilename = generateDocx('cover-letter', {
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      location: profile.location || '',
      title: profile.title || '',
      company: job.company || '',
      job_title: job.title || '',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      cover_letter_content: parsed.coverLetter || '',
    });
    if (docxFilename) {
      clEntry.docxPath = docxFilename;
    }

    if (existing >= 0) {
      coverLetters[existing] = clEntry;
    } else {
      coverLetters.push(clEntry);
    }
    saveData('cover-letters.json', coverLetters);

    res.json(clEntry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate cover letter', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: AI — Chat (Career Coach)
// ---------------------------------------------------------------------------

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'No message provided' });
    }

    const profile = loadData('profile.json');
    const jobs = loadData('jobs.json');

    const systemPrompt = `You are Job Pal, a warm, supportive, and practical AI career coach. Think of yourself as that one friend who happens to be amazing at career advice — encouraging but honest, knowledgeable but approachable.

Your personality:
- Warm and supportive — celebrate wins, empathize with frustrations
- Practical and actionable — give specific, concrete advice
- Honest but kind — if something needs improvement, say so gently with a clear path forward
- Knowledgeable — you understand hiring, ATS systems, networking, interviewing, salary negotiation
- Encouraging — job searching is hard, remind the user they're doing great

You have access to the user's profile and saved jobs for context.

## User Profile
${JSON.stringify(profile, null, 2)}

## Saved Jobs (${jobs.length} total)
${jobs.length > 0 ? jobs.slice(0, 10).map((j) => `- ${j.title || 'Untitled'} at ${j.company || 'Unknown'}`).join('\n') : 'No jobs saved yet.'}

${context ? `## Current Context\n${JSON.stringify(context, null, 2)}` : ''}

Keep responses conversational and helpful. Use formatting (markdown) when listing things out, but keep the tone friendly. If you don't know something, say so honestly and suggest where they might find the answer.`;

    const result = await callClaude(systemPrompt, message);
    res.json({ reply: result });
  } catch (err) {
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Custom Job Boards
// ---------------------------------------------------------------------------

app.get('/api/custom-boards', (req, res) => {
  const boards = loadData('custom-boards.json');
  res.json(boards);
});

app.post('/api/custom-boards', (req, res) => {
  const { name, url, description } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }
  const boards = loadData('custom-boards.json');
  const board = {
    id: uuidv4(),
    name: name.trim(),
    url: url.trim(),
    description: (description || '').trim(),
    createdAt: new Date().toISOString()
  };
  boards.push(board);
  saveData('custom-boards.json', boards);
  res.status(201).json(board);
});

app.delete('/api/custom-boards/:id', (req, res) => {
  let boards = loadData('custom-boards.json');
  const initialLength = boards.length;
  boards = boards.filter((b) => b.id !== req.params.id);
  if (boards.length === initialLength) {
    return res.status(404).json({ error: 'Board not found' });
  }
  saveData('custom-boards.json', boards);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// ROUTES: AI — Headhunter Search
// ---------------------------------------------------------------------------

app.post('/api/headhunter/search', async (req, res) => {
  try {
    const { query } = req.body;
    const profile = loadData('profile.json');
    const jobs = loadData('jobs.json');

    const systemPrompt = `You are a professional headhunter and job search strategist.
Given a candidate's profile (and optionally their saved jobs and a search query), generate a comprehensive job search strategy.

Return ONLY valid JSON with no markdown fencing:
{
  "searchQueries": [
    {
      "platform": "string - e.g. LinkedIn, Indeed, Glassdoor, Google",
      "query": "string - the exact search query to use",
      "url": "string - direct search URL with the query pre-filled"
    }
  ],
  "suggestedCompanies": [
    {
      "name": "string",
      "reason": "string - why this company is a good fit",
      "careerPageUrl": "string - URL to their careers page if known, otherwise empty"
    }
  ],
  "recommendedTitles": ["array of job titles to search for based on the candidate's background"],
  "industryBoards": [
    {
      "name": "string - name of the niche/industry job board",
      "url": "string - URL",
      "description": "string - what makes this board relevant"
    }
  ],
  "searchTips": ["array of actionable tips for this specific search"],
  "summary": "string - brief strategic overview of the recommended approach"
}

Make all URLs real and functional when possible. For search URLs, properly encode the query parameters.`;

    const userMessage = `## Candidate Profile
${JSON.stringify(profile, null, 2)}

## Previously Saved Jobs (for reference on interests)
${jobs.length > 0 ? jobs.slice(0, 10).map((j) => `- ${j.title || 'Untitled'} at ${j.company || 'Unknown'} (${j.field || 'Unknown field'})`).join('\n') : 'No saved jobs yet.'}

## Search Request
${query ? `The user is specifically looking for: "${query}"` : 'Generate a general search strategy based on the candidate\'s profile and interests.'}`;

    const result = await callClaude(systemPrompt, userMessage);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({
        error: 'Failed to parse headhunter results',
        raw: result
      });
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: 'Headhunter search failed', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Writing Samples
// ---------------------------------------------------------------------------

app.get('/api/writing-samples', (req, res) => {
  try {
    const samples = loadData('writing-samples.json');
    res.json(samples);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load writing samples', details: err.message });
  }
});

app.post('/api/writing-samples', (req, res) => {
  try {
    const samples = loadData('writing-samples.json');
    const { title, content, type } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const newSample = {
      id: uuidv4(),
      title,
      content,
      type: type || 'general',
      createdAt: new Date().toISOString()
    };
    samples.push(newSample);
    saveData('writing-samples.json', samples);
    res.status(201).json(newSample);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save writing sample', details: err.message });
  }
});

app.delete('/api/writing-samples/:id', (req, res) => {
  try {
    let samples = loadData('writing-samples.json');
    const initialLength = samples.length;
    samples = samples.filter((s) => s.id !== req.params.id);
    if (samples.length === initialLength) {
      return res.status(404).json({ error: 'Writing sample not found' });
    }
    saveData('writing-samples.json', samples);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete writing sample', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Resumes
// ---------------------------------------------------------------------------

app.get('/api/resumes', (req, res) => {
  try {
    const resumes = loadData('resumes.json');
    res.json(resumes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load resumes', details: err.message });
  }
});

app.get('/api/resumes/:jobId', (req, res) => {
  try {
    const resumes = loadData('resumes.json');
    const resume = resumes.find((r) => r.jobId === req.params.jobId);
    if (!resume) {
      return res.status(404).json({ error: 'No tailored resume found for this job' });
    }
    res.json(resume);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load resume', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Cover Letters
// ---------------------------------------------------------------------------

app.get('/api/cover-letters', (req, res) => {
  try {
    const coverLetters = loadData('cover-letters.json');
    res.json(coverLetters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cover letters', details: err.message });
  }
});

app.get('/api/cover-letters/:jobId', (req, res) => {
  try {
    const coverLetters = loadData('cover-letters.json');
    const cl = coverLetters.find((c) => c.jobId === req.params.jobId);
    if (!cl) {
      return res.status(404).json({ error: 'No cover letter found for this job' });
    }
    res.json(cl);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cover letter', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Document Templates
// ---------------------------------------------------------------------------

app.get('/api/templates', (req, res) => {
  try {
    const templates = loadData('document-templates.json');
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load templates', details: err.message });
  }
});

app.post('/api/templates/upload', upload.single('template'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const templateType = req.body.type; // 'resume' or 'cover-letter'
    if (!templateType || !['resume', 'cover-letter'].includes(templateType)) {
      return res.status(400).json({ error: 'Template type must be "resume" or "cover-letter"' });
    }

    const id = uuidv4();
    const ext = path.extname(req.file.originalname) || '.docx';
    const filename = `${templateType}-${id}${ext}`;
    const filePath = path.join(DATA_DIR, 'templates', filename);

    // Save the file
    fs.writeFileSync(filePath, req.file.buffer);

    // Scan for placeholders
    let placeholders = [];
    try {
      const zip = new PizZip(req.file.buffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      // Get the internal parsed tags
      const tags = doc.getFullText();
      const tagMatches = tags.match(/\{([^}]+)\}/g) || [];
      placeholders = [...new Set(tagMatches.map(t => t.replace(/[{}]/g, '')))];
    } catch {
      // Placeholder scanning failed — non-fatal
    }

    // Update metadata
    const templates = loadData('document-templates.json');

    // Remove any existing template of the same type
    const filtered = templates.filter(t => t.type !== templateType);

    const entry = {
      id,
      type: templateType,
      originalName: req.file.originalname,
      filename,
      placeholders,
      uploadedAt: new Date().toISOString()
    };
    filtered.push(entry);
    saveData('document-templates.json', filtered);

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload template', details: err.message });
  }
});

app.delete('/api/templates/:id', (req, res) => {
  try {
    const templates = loadData('document-templates.json');
    const template = templates.find(t => t.id === req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete file
    const filePath = path.join(DATA_DIR, 'templates', template.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from metadata
    const filtered = templates.filter(t => t.id !== req.params.id);
    saveData('document-templates.json', filtered);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template', details: err.message });
  }
});

app.get('/api/generated/:id/download', (req, res) => {
  try {
    // Look in resumes and cover letters for the matching docxPath
    const resumes = loadData('resumes.json');
    const coverLetters = loadData('cover-letters.json');

    let entry = resumes.find(r => r.id === req.params.id);
    let docType = 'resume';
    if (!entry) {
      entry = coverLetters.find(cl => cl.id === req.params.id);
      docType = 'cover-letter';
    }

    if (!entry || !entry.docxPath) {
      return res.status(404).json({ error: 'No generated document found' });
    }

    const filePath = path.join(DATA_DIR, 'generated', entry.docxPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document file not found on disk' });
    }

    const downloadName = `${docType}-${(entry.company || 'document').replace(/[^a-zA-Z0-9]/g, '-')}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download document', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Contacts
// ---------------------------------------------------------------------------

app.get('/api/contacts', (req, res) => {
  try {
    const contacts = loadData('contacts.json');
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load contacts', details: err.message });
  }
});

app.post('/api/contacts', (req, res) => {
  try {
    const contacts = loadData('contacts.json');
    const newContact = {
      id: uuidv4(),
      name: req.body.name || '',
      company: req.body.company || '',
      role: req.body.role || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      linkedIn: req.body.linkedIn || '',
      jobIds: req.body.jobIds || [],
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    contacts.push(newContact);
    saveData('contacts.json', contacts);
    res.status(201).json(newContact);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create contact', details: err.message });
  }
});

app.put('/api/contacts/:id', (req, res) => {
  try {
    const contacts = loadData('contacts.json');
    const index = contacts.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const { notes, ...updateFields } = req.body;
    contacts[index] = {
      ...contacts[index],
      ...updateFields,
      id: contacts[index].id,
      notes: contacts[index].notes,
      updatedAt: new Date().toISOString()
    };
    saveData('contacts.json', contacts);
    res.json(contacts[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contact', details: err.message });
  }
});

app.delete('/api/contacts/:id', (req, res) => {
  try {
    let contacts = loadData('contacts.json');
    const initialLength = contacts.length;
    contacts = contacts.filter((c) => c.id !== req.params.id);
    if (contacts.length === initialLength) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    saveData('contacts.json', contacts);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete contact', details: err.message });
  }
});

app.post('/api/contacts/:id/notes', (req, res) => {
  try {
    const contacts = loadData('contacts.json');
    const contact = contacts.find((c) => c.id === req.params.id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const note = {
      id: uuidv4(),
      text: req.body.text || '',
      createdAt: new Date().toISOString()
    };
    contact.notes.push(note);
    contact.updatedAt = new Date().toISOString();
    saveData('contacts.json', contacts);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note', details: err.message });
  }
});

app.delete('/api/contacts/:id/notes/:noteId', (req, res) => {
  try {
    const contacts = loadData('contacts.json');
    const contact = contacts.find((c) => c.id === req.params.id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    const initialLength = contact.notes.length;
    contact.notes = contact.notes.filter((n) => n.id !== req.params.noteId);
    if (contact.notes.length === initialLength) {
      return res.status(404).json({ error: 'Note not found' });
    }
    contact.updatedAt = new Date().toISOString();
    saveData('contacts.json', contacts);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// ROUTES: Mock Interviews
// ---------------------------------------------------------------------------

app.get('/api/jobs/:jobId/mock-interviews', (req, res) => {
  try {
    const interviews = loadData('mock-interviews.json');
    const jobInterviews = interviews.filter((i) => i.jobId === req.params.jobId);
    res.json(jobInterviews);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load mock interviews', details: err.message });
  }
});

app.post('/api/jobs/:jobId/mock-interview/start', async (req, res) => {
  try {
    const jobs = loadData('jobs.json');
    const job = jobs.find((j) => j.id === req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const profile = loadData('profile.json');

    const systemPrompt = `You are a professional interviewer conducting a mock interview for a specific job position. Your role is to help the candidate practice and improve.

INSTRUCTIONS:
- You are interviewing a candidate for the role of "${job.title || 'this position'}" at ${job.company || 'the company'}.
- Ask ONE question at a time.
- Start with a warm introduction and your first question.
- Mix behavioral, technical, and situational questions based on the job description.
- Base questions on the job requirements and current industry trends.
- Keep a professional but encouraging tone.
- This is your opening question — make it a good icebreaker.

Return ONLY valid JSON with no markdown fencing:
{
  "question": "string - your interview question",
  "questionType": "string - behavioral, technical, or situational",
  "tip": "string - a brief tip for answering this type of question"
}`;

    const userMessage = `## Job Description
${JSON.stringify(job, null, 2)}

## Candidate Profile
${JSON.stringify(profile, null, 2)}`;

    const result = await callClaude(systemPrompt, userMessage);

    let parsed;
    try {
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse interviewer response', raw: result });
    }

    const session = {
      id: uuidv4(),
      jobId: req.params.jobId,
      messages: [
        { role: 'assistant', content: parsed.question, questionType: parsed.questionType, tip: parsed.tip }
      ],
      questionCount: 1,
      feedback: null,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    const interviews = loadData('mock-interviews.json');
    interviews.push(session);
    saveData('mock-interviews.json', interviews);

    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start mock interview', details: err.message });
  }
});

app.post('/api/jobs/:jobId/mock-interview/:id/respond', async (req, res) => {
  try {
    const { answer } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }

    const interviews = loadData('mock-interviews.json');
    const session = interviews.find((i) => i.id === req.params.id && i.jobId === req.params.jobId);
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }
    if (session.completedAt) {
      return res.status(400).json({ error: 'This interview session is already complete' });
    }

    const jobs = loadData('jobs.json');
    const job = jobs.find((j) => j.id === req.params.jobId);

    // Build conversation history
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.role === 'assistant'
        ? `[Question - ${m.questionType || 'general'}]: ${m.content}`
        : m.content
    }));
    conversationHistory.push({ role: 'user', content: answer });

    const systemPrompt = `You are a professional interviewer conducting a mock interview for "${job?.title || 'a position'}" at ${job?.company || 'a company'}.

INSTRUCTIONS:
- The candidate just answered your question. Provide brief, constructive feedback on their answer.
- Then ask your next interview question.
- Mix behavioral, technical, and situational questions.
- You've asked ${session.questionCount} question(s) so far. Plan for 5-7 total questions.
- Be encouraging but honest.

Return ONLY valid JSON with no markdown fencing:
{
  "feedback": "string - brief feedback on the candidate's answer (2-3 sentences)",
  "question": "string - your next interview question",
  "questionType": "string - behavioral, technical, or situational",
  "tip": "string - a brief tip for answering this type of question"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationHistory
    });

    const resultText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed;
    try {
      const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, resultText];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse interviewer response', raw: resultText });
    }

    // Add user answer and assistant response to session
    session.messages.push({ role: 'user', content: answer });
    session.messages.push({
      role: 'assistant',
      content: parsed.question,
      feedback: parsed.feedback,
      questionType: parsed.questionType,
      tip: parsed.tip
    });
    session.questionCount += 1;

    saveData('mock-interviews.json', interviews);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process interview response', details: err.message });
  }
});

app.post('/api/jobs/:jobId/mock-interview/:id/end', async (req, res) => {
  try {
    const interviews = loadData('mock-interviews.json');
    const session = interviews.find((i) => i.id === req.params.id && i.jobId === req.params.jobId);
    if (!session) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    const jobs = loadData('jobs.json');
    const job = jobs.find((j) => j.id === req.params.jobId);

    // Build full conversation for assessment
    const conversationHistory = session.messages.map((m) => ({
      role: m.role,
      content: m.role === 'assistant'
        ? (m.feedback ? `[Feedback]: ${m.feedback}\n[Question]: ${m.content}` : m.content)
        : m.content
    }));

    const systemPrompt = `You are a professional interviewer who just finished a mock interview for "${job?.title || 'a position'}" at ${job?.company || 'a company'}.

Provide a comprehensive assessment of the candidate's performance across all questions.

Return ONLY valid JSON with no markdown fencing:
{
  "overallScore": number (1-10),
  "summary": "string - 2-3 sentence overall assessment",
  "strengths": ["array of 2-4 specific strengths demonstrated"],
  "improvements": ["array of 2-4 specific areas for improvement"],
  "tips": ["array of 2-3 actionable tips for the actual interview"]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: conversationHistory
    });

    const resultText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed;
    try {
      const jsonMatch = resultText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, resultText];
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse assessment', raw: resultText });
    }

    session.feedback = parsed;
    session.completedAt = new Date().toISOString();
    saveData('mock-interviews.json', interviews);

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to end mock interview', details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Helper: Generate .docx from template
// ---------------------------------------------------------------------------

function generateDocx(templateType, data) {
  const templates = loadData('document-templates.json');
  const template = templates.find(t => t.type === templateType);
  if (!template) return null;

  const templatePath = path.join(DATA_DIR, 'templates', template.filename);
  if (!fs.existsSync(templatePath)) return null;

  try {
    const templateBuffer = fs.readFileSync(templatePath);
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.render(data);

    // Post-process: remove paragraphs that are empty experience artifacts
    const outputZip = doc.getZip();
    let docXml = outputZip.file('word/document.xml').asText();
    // Remove paragraphs whose only visible text is just separators like "  —  " "  •  "
    const paragraphs = docXml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
    for (const p of paragraphs) {
      const texts = (p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [])
        .map(t => t.replace(/<[^>]+>/g, ''))
        .join('');
      const stripped = texts.replace(/[\s—•\u2022\u2014\-|]/g, '').trim();
      if (texts.trim() && !stripped) {
        // This paragraph contains only separator characters — remove it
        docXml = docXml.replace(p, '');
      }
    }
    outputZip.file('word/document.xml', docXml);

    const outputBuffer = outputZip.generate({ type: 'nodebuffer' });
    const outputFilename = `${templateType}-${uuidv4()}.docx`;
    const outputPath = path.join(DATA_DIR, 'generated', outputFilename);
    fs.writeFileSync(outputPath, outputBuffer);

    return outputFilename;
  } catch (err) {
    console.error(`[Docx Generation] Failed for ${templateType}:`, err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

ensureDataFiles();

app.listen(PORT, () => {
  console.log(`\n\u2728 Job Pal is ready to help you shine! Visit http://localhost:${PORT}\n`);
});
