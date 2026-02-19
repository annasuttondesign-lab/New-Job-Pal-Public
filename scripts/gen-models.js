/**
 * Data Model Inventory Generator
 * Scans server.js for DATA_DEFAULTS and data file usage to document data schemas.
 * Run: npm run gen:models
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SERVER_FILE = path.join(PROJECT_ROOT, 'server.js');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'docs', '_generated', 'models.md');

const source = fs.readFileSync(SERVER_FILE, 'utf-8');

// ── Extract DATA_DEFAULTS from server.js ────────────────────────────────────
// This gives us the schema definition as defined in code

function extractDataDefaults(source) {
  const startMarker = 'const DATA_DEFAULTS = {';
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return null;

  // Find the matching closing brace
  let braceCount = 0;
  let i = source.indexOf('{', startIdx);
  const start = i;
  for (; i < source.length; i++) {
    if (source[i] === '{') braceCount++;
    if (source[i] === '}') braceCount--;
    if (braceCount === 0) break;
  }

  const block = source.slice(start, i + 1);

  // Safely evaluate — the object only contains primitives and empty arrays
  try {
    let jsonish = block
      .replace(/'/g, '"')                          // single → double quotes
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')  // unquoted keys → quoted
      .replace(/,\s*}/g, '}')                      // trailing commas
      .replace(/,\s*]/g, ']');
    return JSON.parse(jsonish);
  } catch {
    // Fallback: just extract file names and detect array vs object
    const result = {};
    const fileRegex = /['"]([^'"]+\.json)['"]\s*:\s*(\[|\{)/g;
    let m;
    while ((m = fileRegex.exec(block)) !== null) {
      result[m[1]] = m[2] === '[' ? [] : {};
    }
    return Object.keys(result).length > 0 ? result : null;
  }
}

// ── Scan actual data files to detect real-world schema ──────────────────────

function scanDataFiles() {
  const models = {};

  if (!fs.existsSync(DATA_DIR)) return models;

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
      const data = JSON.parse(raw);

      if (Array.isArray(data)) {
        if (data.length > 0) {
          // Use first item as schema example
          models[file] = { type: 'array', sample: data[0], count: data.length };
        } else {
          models[file] = { type: 'array', sample: null, count: 0 };
        }
      } else if (typeof data === 'object' && data !== null) {
        models[file] = { type: 'object', sample: data, count: null };
      }
    } catch {
      models[file] = { type: 'unknown', sample: null, count: null };
    }
  }

  return models;
}

// ── Describe an object's fields ─────────────────────────────────────────────

function describeFields(obj, indent) {
  if (!obj || typeof obj !== 'object') return [];

  const rows = [];
  for (const [key, value] of Object.entries(obj)) {
    let type;
    let note = '';

    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object') {
        type = 'array of objects';
        note = `Fields: ${Object.keys(value[0]).join(', ')}`;
      } else if (value.length > 0) {
        type = `array of ${typeof value[0]}s`;
      } else {
        type = 'array (empty)';
      }
    } else if (value === null) {
      type = 'null';
    } else {
      type = typeof value;
      if (type === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
        type = 'string (date)';
      } else if (type === 'string' && value.match(/^[0-9a-f]{8}-/i)) {
        type = 'string (UUID)';
      }
    }

    rows.push({ field: indent + key, type, note });
  }

  return rows;
}

// ── Generate markdown ───────────────────────────────────────────────────────

const defaults = extractDataDefaults(source);
const liveData = scanDataFiles();

let md = `# Data Model Inventory

> **Auto-generated** — Do not edit manually.
> Run \`npm run gen:models\` to regenerate.
> Generated: ${new Date().toISOString().split('T')[0]}

## Overview

This project uses **JSON file-based storage** (no database). All data files live in the \`data/\` directory and are auto-created by \`ensureDataFiles()\` in server.js.

| Data File | Default Type | Live Record Count |
|-----------|-------------|-------------------|
`;

const allFiles = Object.keys(defaults || {});
for (const file of allFiles) {
  const live = liveData[file];
  const defaultType = Array.isArray(defaults[file]) ? 'Array' : 'Object';
  const count = live ? (live.count !== null ? live.count.toString() : 'N/A') : 'File not found';
  md += `| ${file} | ${defaultType} | ${count} |\n`;
}

md += `\n---\n\n`;

// Document each model in detail
for (const file of allFiles) {
  const defaultValue = defaults ? defaults[file] : null;
  const live = liveData[file];
  const modelName = file.replace('.json', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  md += `## ${modelName}\n\n`;
  md += `**File:** \`data/${file}\`  \n`;

  if (Array.isArray(defaultValue)) {
    md += `**Type:** Array of records  \n\n`;

    // Use live data sample if available, otherwise note it's empty by default
    const sample = live && live.sample ? live.sample : null;

    if (sample) {
      md += `| Field | Type | Notes |\n`;
      md += `|-------|------|-------|\n`;
      const fields = describeFields(sample, '');
      for (const f of fields) {
        md += `| ${f.field} | ${f.type} | ${f.note} |\n`;
      }
    } else {
      md += `*Empty by default. Schema inferred from code usage.*\n`;
    }
  } else if (typeof defaultValue === 'object' && defaultValue !== null) {
    md += `**Type:** Single object  \n\n`;
    md += `| Field | Type | Default |\n`;
    md += `|-------|------|---------|\n`;
    for (const [key, value] of Object.entries(defaultValue)) {
      const type = Array.isArray(value) ? 'array' : typeof value;
      const def = Array.isArray(value) ? '[]' : JSON.stringify(value);
      md += `| ${key} | ${type} | ${def} |\n`;
    }
  }

  md += `\n`;
}

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, md, 'utf-8');
console.log(`✅ Data model inventory written to docs/_generated/models.md (${allFiles.length} models documented)`);
