#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const scriptPath = path.resolve(__dirname, "ensure-feature-flags.ts");
const result = spawnSync(
  "npx",
  ["--yes", "tsx", scriptPath],
  { stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
