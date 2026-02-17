#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['apps', 'firebase'];
const TEST_PATH_HINTS = ['test', 'tests', 'spec', 'fixtures', 'playwright', '__snapshots__'];
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.snap']);

function shouldProcess(filePath) {
  const ext = path.extname(filePath);
  if (!FILE_EXTENSIONS.has(ext)) return false;
  const lower = filePath.toLowerCase();
  return TEST_PATH_HINTS.some((hint) => lower.includes(`/${hint}`));
}

function rewrite(content) {
  return content
    .replace(/\bcourierId\b\s*:/g, 'courierUid:')
    .replace(/\bcourierId\b/g, 'courierUid')
    .replace(/(["'])courierId\1/g, '$1courierUid$1');
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function run() {
  const changed = [];
  const roots = TARGET_DIRS.map((d) => path.join(ROOT, d));
  const allFiles = roots.flatMap((dir) => walk(dir));

  for (const filePath of allFiles) {
    if (!shouldProcess(filePath)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    const output = rewrite(source);
    if (output !== source) {
      fs.writeFileSync(filePath, output, 'utf8');
      changed.push(path.relative(ROOT, filePath));
    }
  }

  console.log(`rename-courierid-in-tests: updated ${changed.length} file(s)`);
  changed.forEach((f) => console.log(` - ${f}`));
}

run();
