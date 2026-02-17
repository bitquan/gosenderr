#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appsDir = path.join(root, 'apps');
const maxChunkBytes = Number(process.env.MAX_BUNDLE_CHUNK_BYTES || 1600000);

function getAllFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return getAllFiles(full);
    return [full];
  });
}

const appDirs = fs.existsSync(appsDir)
  ? fs.readdirSync(appsDir).map((name) => path.join(appsDir, name)).filter((p) => fs.statSync(p).isDirectory())
  : [];

const chunkRecords = [];
for (const appPath of appDirs) {
  const assetsPath = path.join(appPath, 'dist', 'assets');
  const appName = path.basename(appPath);
  for (const file of getAllFiles(assetsPath)) {
    if (!file.endsWith('.js')) continue;
    const size = fs.statSync(file).size;
    chunkRecords.push({ app: appName, file, size });
  }
}

if (!chunkRecords.length) {
  console.log('bundle-size-check: no built JS chunks found (run build before this check).');
  process.exit(0);
}

const sorted = [...chunkRecords].sort((a, b) => b.size - a.size);
const offenders = sorted.filter((item) => item.size > maxChunkBytes);

console.log('bundle-size-check: largest chunks');
for (const item of sorted.slice(0, 15)) {
  const rel = path.relative(root, item.file);
  console.log(` - ${item.app}: ${rel} (${(item.size / 1024).toFixed(1)} KiB)`);
}

if (offenders.length) {
  console.error(`\nbundle-size-check: FAIL (${offenders.length} chunk(s) > ${maxChunkBytes} bytes)`);
  offenders.forEach((item) => {
    const rel = path.relative(root, item.file);
    console.error(` - ${item.app}: ${rel} (${item.size} bytes)`);
  });
  process.exit(1);
}

console.log(`\nbundle-size-check: PASS (max chunk threshold ${maxChunkBytes} bytes)`);
