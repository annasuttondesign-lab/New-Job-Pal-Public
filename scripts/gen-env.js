/**
 * Environment Variable Inventory Generator
 * Reads .env.example and scans source files for process.env references.
 * Run: npm run gen:env
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const ENV_EXAMPLE = path.join(PROJECT_ROOT, '.env.example');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'docs', '_generated', 'env-vars.md');

// Files to scan for process.env references
const SCAN_FILES = [
  'server.js',
  'public/js/app.js'
];

// ── Parse .env.example ──────────────────────────────────────────────────────

function parseEnvExample() {
  if (!fs.existsSync(ENV_EXAMPLE)) return [];

  const content = fs.readFileSync(ENV_EXAMPLE, 'utf-8');
  const vars = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    vars.push({
      name: key,
      exampleValue: value,
      documented: true
    });
  }

  return vars;
}

// ── Scan source files for process.env references ────────────────────────────

function scanForEnvUsage() {
  const usages = [];
  const envRegex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
  const envBracketRegex = /process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]\]/g;

  for (const relPath of SCAN_FILES) {
    const fullPath = path.join(PROJECT_ROOT, relPath);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const regex of [envRegex, envBracketRegex]) {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(line)) !== null) {
          usages.push({
            name: match[1],
            file: relPath,
            line: i + 1,
            context: line.trim().slice(0, 100)
          });
        }
      }
    }
  }

  return usages;
}

// ── Categorize variables by prefix ──────────────────────────────────────────

function categorize(varName) {
  if (varName.startsWith('ANTHROPIC_')) return 'AI / Anthropic';
  if (varName.startsWith('PORT') || varName.startsWith('HOST') || varName.startsWith('NODE_')) return 'Server';
  if (varName.startsWith('DB_') || varName.startsWith('DATABASE_')) return 'Database';
  if (varName.startsWith('AWS_') || varName.startsWith('S3_')) return 'Cloud / AWS';
  if (varName.startsWith('SMTP_') || varName.startsWith('EMAIL_')) return 'Email';
  return 'General';
}

// ── Generate report ─────────────────────────────────────────────────────────

const documented = parseEnvExample();
const usages = scanForEnvUsage();

// Build combined list
const allVars = new Map();

for (const v of documented) {
  allVars.set(v.name, {
    name: v.name,
    exampleValue: v.exampleValue,
    inEnvExample: true,
    usedIn: [],
    category: categorize(v.name)
  });
}

for (const u of usages) {
  if (!allVars.has(u.name)) {
    allVars.set(u.name, {
      name: u.name,
      exampleValue: null,
      inEnvExample: false,
      usedIn: [],
      category: categorize(u.name)
    });
  }
  allVars.get(u.name).usedIn.push({ file: u.file, line: u.line });
}

const varList = Array.from(allVars.values());
const undocumented = varList.filter(v => !v.inEnvExample);
const byCategory = {};
for (const v of varList) {
  if (!byCategory[v.category]) byCategory[v.category] = [];
  byCategory[v.category].push(v);
}

let md = `# Environment Variables Inventory

> **Auto-generated** — Do not edit manually.
> Run \`npm run gen:env\` to regenerate.
> Generated: ${new Date().toISOString().split('T')[0]}

**Total variables: ${varList.length}** (${documented.length} documented in .env.example, ${undocumented.length} undocumented)

`;

if (undocumented.length > 0) {
  md += `## ⚠️ Undocumented Variables\n\n`;
  md += `These variables are referenced in code but missing from \`.env.example\`:\n\n`;
  md += `| Variable | Used In |\n`;
  md += `|----------|---------|\n`;
  for (const v of undocumented) {
    const files = v.usedIn.map(u => `${u.file}:${u.line}`).join(', ');
    md += `| \`${v.name}\` | ${files} |\n`;
  }
  md += `\n`;
}

for (const [category, vars] of Object.entries(byCategory)) {
  md += `## ${category}\n\n`;
  md += `| Variable | Example Value | In .env.example | Used In |\n`;
  md += `|----------|--------------|-----------------|----------|\n`;
  for (const v of vars) {
    const example = v.exampleValue !== null ? `\`${v.exampleValue}\`` : '—';
    const documented = v.inEnvExample ? '✅' : '❌';
    const files = v.usedIn.length > 0
      ? v.usedIn.map(u => `${u.file}:${u.line}`).join(', ')
      : 'Not found in scanned files';
    md += `| \`${v.name}\` | ${example} | ${documented} | ${files} |\n`;
  }
  md += `\n`;
}

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
console.log(`✅ Environment variable inventory written to docs/_generated/env-vars.md (${varList.length} variables found)`);
