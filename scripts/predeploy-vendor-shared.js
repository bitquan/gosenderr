#!/usr/bin/env node
// Simple predeploy helper: builds packages/shared and copies its dist to firebase/functions/vendor/@gosenderr/shared
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const sharedDir = path.join(repoRoot, 'packages', 'shared');
const sharedDist = path.join(sharedDir, 'dist');
const targetVendor = path.join(repoRoot, 'firebase', 'functions', 'vendor', '@gosenderr', 'shared');

function run(cmd, opts = {}) {
  console.log('> ' + cmd);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

try {
  // Build shared package
  if (!fs.existsSync(sharedDir)) {
    throw new Error('packages/shared not found; ensure you are in the repo root');
  }

  run('npm --prefix "' + sharedDir + '" run build');

  // Remove old vendor dir
  if (fs.existsSync(targetVendor)) {
    fs.rmSync(targetVendor, { recursive: true, force: true });
  }

  // Recreate vendor dir
  fs.mkdirSync(path.dirname(targetVendor), { recursive: true });
  fs.mkdirSync(targetVendor, { recursive: true });

  // Copy dist
  if (!fs.existsSync(sharedDist)) {
    throw new Error('packages/shared/dist not found after build');
  }

  const copyRecursive = (src, dest) => {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      for (const f of fs.readdirSync(src)) {
        copyRecursive(path.join(src, f), path.join(dest, f));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  copyRecursive(sharedDist, path.join(targetVendor, 'dist'));

  // copy package.json for integrity
  fs.copyFileSync(path.join(sharedDir, 'package.json'), path.join(targetVendor, 'package.json'));

  console.log('\n✅ Vendored @gosenderr/shared into firebase/functions/vendor/@gosenderr/shared');
  console.log('Note: this modifies local files but does not commit them. Commit if you want vendor checked into repo.');
} catch (err) {
  console.error('\n❌ predeploy-vendor-shared failed: ' + err.message);
  process.exit(1);
}
