# GitHub Actions Workflows Guide

This file is the canonical map of active workflows under `.github/workflows/`.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-07`
> - Review cadence: `weekly`

## Workflow Inventory

### Core CI

- `ci.yml` (`CI`)
  - Triggers:
    - `pull_request` (all branches)
    - `push` to `main`
  - Purpose:
    - Repo-wide lint/docs/type/build/unit checks.
    - Includes admin desktop packaging matrix (`macos-latest`, `windows-latest`).
  - Key jobs:
    - `checks` (Lint + Docs)
    - `typecheck`
    - `build`
    - `tests`
    - `admin-desktop-packaging`

- `senderr_app-ci.yml` (`Senderr App CI`)
  - Triggers:
    - `pull_request` to `senderr_app`
  - Purpose:
    - Guard Senderr stream work (including iOS smoke/audit checks).
  - Key jobs:
    - `checks` (Lint, Type-check, Tests, `ios:audit:deps:check`, `ios:smoke`)

- `marketplace-ci.yml` (`Marketplace CI`)
  - Triggers:
    - `pull_request` with marketplace/package/firebase path filters
  - Purpose:
    - Marketplace build/lint checks plus optional E2E.
  - Key jobs:
    - `changes` (path filter)
    - `checks`
    - `e2e` (runs when scoped changes or `run-marketplace-e2e` label present)

- `courier-ci.yml` (`Senderr App CI`)
  - Triggers:
    - `pull_request` with senderr-app/docs/packages path filters
  - Purpose:
    - Lightweight senderr web lint/build gate for path-scoped PRs.
  - Key jobs:
    - `checks`

### Security and Analysis

- `ci-and-deploy.yml` (`CI and Deploy`)
  - Triggers:
    - `workflow_dispatch`
    - `push` to `main`
    - `pull_request` to `main`
    - weekly schedule
  - Purpose:
    - Trivy filesystem vulnerability scan and SARIF upload.
  - Key jobs:
    - `trivy`

- `codeql-analysis.yml` (`CodeQL`)
  - Triggers:
    - `push` to `main`
    - `pull_request` to `main`
    - `workflow_dispatch`
    - weekly schedule
  - Purpose:
    - CodeQL static analysis for `javascript-typescript`.
  - Key jobs:
    - `analyze`

### Delivery and Operations

- `deploy.yml` (`Deploy (Manual)`)
  - Triggers:
    - `workflow_dispatch` with `environment` input (`production`, `staging`, `dev`)
  - Purpose:
    - Manual environment deploy entrypoint.
  - Key jobs:
    - `deploy`

- `docker-smoke.yml` (`Docker Smoke Tests (Manual)`)
  - Triggers:
    - `workflow_dispatch`
  - Purpose:
    - Run Docker smoke test path (`pnpm smoke:docker`).
  - Key jobs:
    - `docker-smoke`

- `cleanup-workflow-runs.yml` (`Cleanup old workflow runs`)
  - Triggers:
    - `workflow_dispatch` with cleanup controls (`days`, `workflow_id`, `branch`, `preview`)
  - Purpose:
    - Preview/delete old workflow runs and post summary issue.
  - Key jobs:
    - `cleanup`

- `senderr_app-audit.yml` (`Senderr App - Flow Audit Reminder`)
  - Triggers:
    - monthly schedule
    - `workflow_dispatch`
  - Purpose:
    - Open monthly flow-audit reminder issue for Senderr stream.
  - Key jobs:
    - `create-audit-issue`

- `lifecycle-milestone-sync.yml` (`Lifecycle Milestone Sync`)
  - Triggers:
    - `issues` (`opened`, `edited`)
    - `pull_request` (`opened`, `edited`, `synchronize`)
  - Purpose:
    - Parse `Lifecycle: Mx` or `Mx` from issue/PR body and set the matching GitHub milestone automatically when present.
  - Key jobs:
    - `set-milestone`

- `docs-drift-audit.yml` (`Docs Drift Audit`)
  - Triggers:
    - weekly schedule
    - `workflow_dispatch`
  - Purpose:
    - Run canonical docs drift checks and publish an artifact report.
    - Open/update a tracking issue if docs verification fails.
  - Key jobs:
    - `docs-drift-audit`

## Secrets and Config Dependencies

Primary checklist:

- `/docs/github-actions-fixes/SECRETS_CHECKLIST.md`

Common secret groups:

- Production build validation (`ci.yml` on `main`):
  - `VITE_FIREBASE_*`
  - `VITE_MAPBOX_TOKEN`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
- Manual deploy (`deploy.yml`):
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - `NEXT_PUBLIC_FIREBASE_*`
  - `NEXT_PUBLIC_MAPBOX_TOKEN`

## Failure Triage

### Install / pnpm failures

1. Confirm `corepack enable` and `pnpm/action-setup@v4` are present in workflow.
2. Re-run locally with:
   - `pnpm install --frozen-lockfile`
3. If lockfile drift exists, regenerate lockfile in a focused PR.

### Docs verification failures

1. Run:
   - `pnpm run verify:docs`
2. Resolve broken links/TODO policy violations in canonical docs.
3. For weekly audit failures:
   - open the latest `docs-drift-audit-report` artifact
   - triage the related open issue titled `Docs drift audit failure`
   - fix drift in a PR and close or update that issue

### Senderr iOS checks (`senderr_app-ci.yml`)

1. Run locally:
   - `pnpm run ios:audit:deps:check`
   - `pnpm run ios:smoke`
2. If failing, fix scripts/config under:
   - `scripts/ios-*.sh`
   - `apps/courieriosnativeclean`

### Marketplace E2E failures

1. Run locally:
   - `pnpm --filter @gosenderr/marketplace-app test:e2e`
2. Validate emulator startup path:
   - `scripts/start-emulators.sh`
3. Verify Playwright browser install step and emulator seed scripts.

### Admin Desktop packaging failures

1. Run local build:
   - `pnpm --filter @gosenderr/admin-desktop build`
2. Validate packaging script:
   - `pnpm --filter @gosenderr/admin-desktop pack`
3. Recheck OS-specific failures (`macos-latest` vs `windows-latest`) in job logs.

### Security scan failures

1. Review SARIF details in Code Scanning tab.
2. Prioritize `HIGH`/`CRITICAL` findings and patch dependencies.
3. Re-run affected workflows to confirm clean scan.

## Operational Rules

- Do not remove active workflow files without updating this guide in the same PR.
- When adding a workflow, add it here with triggers, purpose, and triage notes.
- Keep workflow names in docs synchronized with `name:` values in workflow YAML files.
- Operational owner for docs audit outputs:
  - `@bitquan` reviews weekly docs drift issues and drives follow-up PRs.
