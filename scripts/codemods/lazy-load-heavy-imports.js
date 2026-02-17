#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'apps');
const TARGET_EXTENSIONS = new Set(['.ts', '.tsx']);
const HEAVY_IMPORTS = ['mapbox-gl', '@react-google-maps/api'];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function run() {
  const files = walk(TARGET_DIR)
    .filter((file) => TARGET_EXTENSIONS.has(path.extname(file)));

  const report = [];
  const importRegex = /import\s+[^;]+\s+from\s+['"]([^'"]+)['"];?/g;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (HEAVY_IMPORTS.includes(importPath)) {
        report.push({ file: path.relative(ROOT, file), importPath });
      }
    }
  }

  if (!report.length) {
    console.log('lazy-load-heavy-imports: no heavy static imports found');
    return;
  }

  console.log('lazy-load-heavy-imports: detected heavy static imports');
  report.forEach(({ file, importPath }) => {
    console.log(` - ${file}: ${importPath}`);
  });
  console.log('\nNext step: replace page-level static imports with React.lazy / dynamic import in these files.');
}

run();
