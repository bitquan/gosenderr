# GitHub Actions Workflows Guide

## Overview
This repository uses several workflows for CI, E2E, smoke tests, and deployment:

- `CI + Deploy (ci-and-deploy.yml)` — main CI jobs (lint, typecheck, build, tests) and deployment gate to cloud run & Firebase Hosting.
- `Deploy to Firebase Hosting (deploy-hosting.yml)` — targeted hosting deploys triggered on `main` when app paths change.
- `E2E (Emulator) (e2e-emulator.yml)` — runs Playwright E2E tests against local Firebase emulators on PRs.
- `Smoke Test — Customer / Vendor` — fast smoke tests on PRs for critical flows.
- `Workflow Health Monitor` — weekly check of workflow health; opens issue when success rate < 80%.

## Common Failures & How To Fix
- ESLint fails with "plugin not found": run `pnpm -w add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser` at repo root and then `pnpm -w -s -C . run -w lint`.
- Trivy SARIF upload fails: either set `CODE_SCANNING_ENABLED=true` in repo secrets or rely on the conditional SARIF upload in the workflow.
- Playwright/E2E fails due to `pnpm` missing: ensure `corepack enable && corepack prepare pnpm@latest --activate` or use `pnpm/action-setup@v4` as in our workflows.

## Manual Deployment
To run a manual deploy (staging or production):
1. Go to Actions > CI + Deploy > Run workflow
2. Select environment `production` or `staging` and click `Run workflow`.

## Debugging Failed Runs
1. Open the failed run in Actions and inspect the failing job logs.
2. Download artifacts (Playwright traces) if provided.
3. Reproduce failing steps locally (use `scripts/run-local-e2e.sh` for E2E).
4. Fix minimal code or workflow change in a small branch and open a PR.

## Secrets & Configuration
See `docs/github-actions-fixes/SECRETS_CHECKLIST.md` for details on required secrets.
