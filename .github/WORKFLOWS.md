# GitHub Actions Workflows Guide

## Overview
This repository uses the following workflows:

- `CI (ci.yml)` — lint, docs verification, type check, build, and unit tests on PRs and main.
- `CI and Deploy (ci-and-deploy.yml)` — Trivy security scan (scheduled + PR/main).
- `CodeQL (codeql-analysis.yml)` — CodeQL analysis on PRs/main and weekly schedule.
- `Deploy (deploy.yml)` — manual deployment workflow with environment selection.
- `Docker Smoke Tests (docker-smoke.yml)` — manual Docker smoke tests.
- `Cleanup Workflow Runs (cleanup-workflow-runs.yml)` — maintenance cleanup for old workflow runs.

## Common Failures & How To Fix
- ESLint fails with "plugin not found": run `pnpm -w add -D @typescript-eslint/eslint-plugin @typescript-eslint/parser` at repo root and then `pnpm -w -s -C . run -w lint`.
- Trivy SARIF upload fails: either set `CODE_SCANNING_ENABLED=true` in repo secrets or rely on the conditional SARIF upload in the workflow.
- pnpm not found: ensure `corepack enable` runs or use `pnpm/action-setup@v4` as in our workflows.

## Manual Deployment
To run a manual deploy (staging or production):
1. Go to Actions > Deploy (Manual) > Run workflow
2. Select environment `production`, `staging`, or `dev` and click `Run workflow`.

## Debugging Failed Runs
1. Open the failed run in Actions and inspect the failing job logs.
2. Download artifacts (Playwright traces) if provided.
3. Reproduce failing steps locally by running the same commands from the workflow.
4. Fix minimal code or workflow change in a small branch and open a PR.

## Secrets & Configuration
See the `env:` blocks in each workflow file for required secrets and variables. The checklist is in [docs/github-actions-fixes/SECRETS_CHECKLIST.md](../docs/github-actions-fixes/SECRETS_CHECKLIST.md).
