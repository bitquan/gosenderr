#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptPath = resolve(__dirname, "ensure-feature-flags.ts");

const result = spawnSync(
  "npx",
  ["--yes", "tsx", scriptPath, "--verify"],
  { stdio: "inherit", env: process.env },
);

process.exit(result.status ?? 1);
