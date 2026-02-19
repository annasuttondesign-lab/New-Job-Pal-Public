/**
 * Pre-Commit Documentation Drift Checker
 * Runs on every git commit. Checks if doc-relevant code changed without
 * corresponding documentation updates. Prints warnings + ready-to-paste
 * Claude Code prompts. NEVER blocks commits (always exits 0).
 *
 * Called from: .husky/pre-commit (or .git/hooks/pre-commit)
 */

const { execSync } = require('child_process');
const path = require('path');

// ── Get staged files ────────────────────────────────────────────────────────

let stagedFiles;
try {
  const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
  stagedFiles = output.trim().split('\n').filter(Boolean);
} catch {
  // Not in a git repo or no staged files
  process.exit(0);
}

if (stagedFiles.length === 0) {
  process.exit(0);
}

// ── Documentation mapping ───────────────────────────────────────────────────
// Maps code file patterns to the documentation they should trigger

const DOC_MAPPINGS = [
  {
    name: 'API Routes',
    codePatterns: [/^server\.js$/],
    codeTest: (file, stagedFiles) => file === 'server.js',
    docPatterns: [/^docs\/_generated\/api-routes\.md$/],
    genCommand: 'npm run gen:api-routes',
    description: 'API route definitions'
  },
  {
    name: 'Data Models',
    codePatterns: [/^server\.js$/],
    codeTest: (file) => file === 'server.js',
    docPatterns: [/^docs\/_generated\/models\.md$/],
    genCommand: 'npm run gen:models',
    description: 'data model schemas'
  },
  {
    name: 'Environment Variables',
    codePatterns: [/^\.env\.example$/, /^server\.js$/],
    codeTest: (file) => file === '.env.example' || file === 'server.js',
    docPatterns: [/^docs\/_generated\/env-vars\.md$/],
    genCommand: 'npm run gen:env',
    description: 'environment variable configuration'
  },
  {
    name: 'Frontend',
    codePatterns: [/^public\//],
    codeTest: (file) => file.startsWith('public/'),
    docPatterns: [/^docs\/frontend-notes\.md$/],
    genCommand: null,
    description: 'frontend UI code'
  }
];

// ── Check for drift ─────────────────────────────────────────────────────────

const codeChanges = [];  // Mappings where code changed
const docChanges = [];   // Mappings where docs also changed

for (const mapping of DOC_MAPPINGS) {
  const codeChanged = stagedFiles.some(f => mapping.codeTest(f));
  if (!codeChanged) continue;

  const docChanged = stagedFiles.some(f =>
    mapping.docPatterns.some(p => p.test(f))
  );

  if (docChanged) {
    docChanges.push(mapping);
  } else {
    codeChanges.push(mapping);
  }
}

// Also check if any docs/_generated/ files were staged (general doc update)
const anyGeneratedDocStaged = stagedFiles.some(f => f.startsWith('docs/_generated/'));

// ── Output results ──────────────────────────────────────────────────────────

const write = (msg) => process.stderr.write(msg + '\n');

if (codeChanges.length === 0) {
  if (docChanges.length > 0) {
    write('');
    write('\x1b[32m✅ Documentation looks good!\x1b[0m');
    for (const m of docChanges) {
      write(`   ${m.name}: code and docs both updated`);
    }
    write('');
  }
  process.exit(0);
}

// We have drift!
write('');
write('\x1b[33m⚠️  DOCUMENTATION DRIFT DETECTED\x1b[0m');
write('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
write('');

const changedCodeFiles = new Set();
const genCommands = [];

for (const mapping of codeChanges) {
  write(`\x1b[36m📁 ${mapping.name}\x1b[0m`);

  const relevantFiles = stagedFiles.filter(f => mapping.codeTest(f));
  for (const f of relevantFiles) {
    write(`   Changed: ${f}`);
    changedCodeFiles.add(f);
  }

  const docTargets = mapping.docPatterns.map(p => p.source.replace(/\\\./g, '.').replace(/\^|\$/g, ''));
  write(`   Missing: ${docTargets.join(', ')} was not updated`);

  if (mapping.genCommand) {
    genCommands.push(mapping.genCommand);
  }
  write('');
}

// Print the ready-to-paste Claude Code prompt
write('\x1b[33m📋 Paste this into Claude Code to fix:\x1b[0m');
write('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
write('');

const areas = codeChanges.map(m => m.name).join(', ');
const files = Array.from(changedCodeFiles).join(', ');
const commands = genCommands.length > 0
  ? genCommands.join(' && ')
  : 'npm run gen:all';

write(`I changed ${files} which affects ${areas}.`);
write(`Please run \`${commands}\` to regenerate the documentation,`);
write('then stage and commit the updated docs.');
write('');
write('\x1b[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
write('');
write('\x1b[90m(This is a warning only — your commit will proceed.)\x1b[0m');
write('');

// ALWAYS exit 0 — never block commits
process.exit(0);
