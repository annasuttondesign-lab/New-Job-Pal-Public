/**
 * API Route Inventory Generator
 * Scans server.js for Express route definitions and outputs a markdown table.
 * Run: npm run gen:api-routes
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SERVER_FILE = path.join(PROJECT_ROOT, 'server.js');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'docs', '_generated', 'api-routes.md');

// Read server.js
const source = fs.readFileSync(SERVER_FILE, 'utf-8');
const lines = source.split('\n');

const routes = [];

// Match patterns like: app.get('/api/profile', ...) or app.post('/api/jobs/:id', ...)
const routeRegex = /app\.(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/i;

// Also try to grab a comment or section header above the route for description
let lastComment = '';
let lastSection = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Track section headers (// ---------- Section Name ----------)
  if (line.startsWith('//') && line.includes('---')) {
    const cleaned = line.replace(/^\/\/\s*[-=]+\s*/, '').replace(/\s*[-=]+\s*$/, '').trim();
    if (cleaned.length > 0) {
      lastSection = cleaned;
    }
    continue;
  }

  // Track inline comments
  if (line.startsWith('//') && !line.includes('---')) {
    lastComment = line.replace(/^\/\/\s*/, '').trim();
    continue;
  }

  const match = line.match(routeRegex);
  if (match) {
    const method = match[1].toUpperCase();
    const routePath = match[2];

    // Determine a description from nearby comments
    let description = lastComment || '';

    // Try to infer a description from the route path if no comment
    if (!description) {
      description = inferDescription(method, routePath);
    }

    // Determine feature area from the route path
    const area = inferArea(routePath);

    routes.push({ method, path: routePath, description, area, section: lastSection });

    // Reset comment after use
    lastComment = '';
  } else if (!line.startsWith('//')) {
    // Reset comment if a non-comment, non-route line appears
    lastComment = '';
  }
}

function inferArea(routePath) {
  if (routePath.includes('/api/profile') || routePath.includes('/api/settings')) return 'Profile & Settings';
  if (routePath.includes('/api/jobs') || routePath.includes('/api/headhunter')) return 'Jobs';
  if (routePath.includes('/api/resume')) return 'Resumes';
  if (routePath.includes('/api/cover-letter')) return 'Cover Letters';
  if (routePath.includes('/api/template') || routePath.includes('/api/generated')) return 'Templates & Documents';
  if (routePath.includes('/api/contact')) return 'Contacts';
  if (routePath.includes('/api/writing-sample')) return 'Writing Samples';
  if (routePath.includes('/api/custom-board')) return 'Custom Boards';
  if (routePath.includes('/api/mock-interview') || routePath.includes('mock-interview')) return 'Mock Interviews';
  if (routePath.includes('/api/chat')) return 'Chat';
  return 'Other';
}

function inferDescription(method, routePath) {
  const resource = routePath.split('/').filter(Boolean).pop() || '';
  const cleanResource = resource.replace(/^:/, '').replace(/-/g, ' ');

  switch (method) {
    case 'GET': return `Get ${cleanResource}`;
    case 'POST': return `Create/process ${cleanResource}`;
    case 'PUT': return `Update ${cleanResource}`;
    case 'DELETE': return `Delete ${cleanResource}`;
    default: return '';
  }
}

// Group routes by area
const grouped = {};
for (const route of routes) {
  if (!grouped[route.area]) grouped[route.area] = [];
  grouped[route.area].push(route);
}

// Generate markdown
let md = `# API Routes Inventory

> **Auto-generated** — Do not edit manually.
> Run \`npm run gen:api-routes\` to regenerate.
> Generated: ${new Date().toISOString().split('T')[0]}

**Total routes: ${routes.length}**

`;

for (const [area, areaRoutes] of Object.entries(grouped)) {
  md += `## ${area}\n\n`;
  md += `| Method | Path | Description |\n`;
  md += `|--------|------|-------------|\n`;
  for (const r of areaRoutes) {
    md += `| ${r.method} | \`${r.path}\` | ${r.description} |\n`;
  }
  md += `\n`;
}

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
console.log(`✅ API routes inventory written to docs/_generated/api-routes.md (${routes.length} routes found)`);
