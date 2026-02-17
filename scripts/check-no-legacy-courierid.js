#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const repoRoot = path.resolve(__dirname, '..');
const includeGlobs = [
  'apps/**/*.ts',
  'apps/**/*.tsx',
  'packages/**/*.ts',
  'packages/**/*.tsx',
  'firebase/functions/src/**/*.ts',
];

const excludePatterns = [
  'apps/**/tests/**',
  'apps/**/tests/e2e/**',
  'apps/**/tests/**',
  'packages/**/tests/**',
  'scripts/migrate-courierid-to-courieruid.js',
  'scripts/verify-migration-courierid.js',
  'scripts/migration-runbooks/**',
  'docs/**',
  'firebase/firestore.rules',
  'firebase/storage.rules',
  '**/*.d.ts',
];

const results = [];
const keyRegex = /\bcourierId\s*:/g;

function isTypeDeclarationLine(line) {
  // matches patterns like `courierId: string` or `courierId?: string`
  return /\bcourierId\s*\??\s*:\s*(string|number|boolean|any|\w+)/.test(line);
}

for (const pattern of includeGlobs) {
  const files = glob.sync(pattern, { cwd: repoRoot, absolute: true });
  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    // ignore archive folders explicitly
    if (rel.includes('/_archive/')) continue;
    if (excludePatterns.some((p) => glob.hasMagic(p) ? glob.sync(p, { cwd: repoRoot }).includes(rel) : rel.startsWith(p.replace(/\*.*$/, '')))) continue;
    const txt = fs.readFileSync(file, 'utf8');
    const lines = txt.split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (keyRegex.test(line)) {
        // skip TypeScript declarations and function parameter type annotations
        if (!isTypeDeclarationLine(line)) {
          results.push({ file: rel, line: idx + 1, text: line.trim() });
        }
      }
      keyRegex.lastIndex = 0;
    });
  }
}

if (results.length) {
  console.error('\nFound legacy `courierId:` object-field usages in source (not allowed).');
  console.error('List (file:line):\n');
  for (const r of results) {
    console.error(`${r.file}:${r.line}  —  ${r.text}`);
  }
  console.error('\nPlease remove object-field writes of `courierId` (use `courierUid` instead).');
  process.exit(1);
}

console.log('OK — no forbidden `courierId:` object-field writes found in source.');
process.exit(0);
