# CI Runbook — Local testing and validation

This runbook explains how to run builds, smoke tests, and Playwright E2E locally and how to validate the GitHub workflow changes we made.

## Quick goals
- Run per-app builds locally
- Serve the built `dist` on deterministic ports and verify
- Install Playwright browsers from the workspace and run Playwright tests locally
- Inspect / monitor GitHub Actions runs locally with `gh` and test PR comments
- Validate the cleanup script behavior (note: scheduled workflows only run on default branch)

---

## Local environment
- Node 20 (we use `node: 20` in CI)
- pnpm (we use corepack to enable it: `corepack prepare pnpm@latest --activate`)
- Playwright (we use workspace playright )

Install dependencies:

```bash
# make sure corepack/pnpm is ready on your machine
corepack enable
corepack prepare pnpm@latest --activate
pnpm install
```

### Build and serve a single app (deterministic port)

Example: Customer app

```bash
pnpm --filter @gosenderr/customer-app build
npx serve -s apps/customer-app/dist -l 5173
# Visit http://127.0.0.1:5173
```

Vendor app:

```bash
pnpm --filter @gosenderr/vendor-app build
npx serve -s apps/vendor-app/dist -l 5181
# Visit http://127.0.0.1:5181
```

### Run Playwright tests locally

Install Playwright binaries (from workspace package):

```bash
pnpm --filter @gosenderr/customer-app exec playwright install --with-deps
```

Run the vendor suite in debug mode:

```bash
pnpm --filter @gosenderr/customer-app exec playwright test --config ../../playwright.config.ts tests/e2e/vendor --project=vendor --debug
```

Or run a quick smoke:

```bash
pnpm --filter @gosenderr/customer-app exec playwright test --config ../../playwright.config.ts tests/e2e/vendor/smoke --project=vendor
```

Notes:
- Tests expect the apps to be served at fixed URLs (5173 for customer, 5181 for vendor) — ensure you run `npx serve` on these ports before executing tests.
- Use `--debug` or `--headed` to see the browser locally for debugging.

### Simulate CI behavior
- Use the `gh` CLI to view runs and logs locally:
  - `gh run list --repo <owner>/<repo> --limit 10`
  - `gh run view <run-id> --repo <owner>/<repo> --log`

- To test workflow changes locally, create a branch and push; open a PR. The PR will trigger the same workflows we edited. Use the PR checks to confirm behavior.

### Test the cleanup workflow locally (simulate)
The scheduled cleanup runs only on the default branch once merged; to simulate deletion locally you can run a node script that uses the REST API and a personal access token with `repo` scope.

Example (quick Node script):

```js
// scripts/test-cleanup.js
const { Octokit } = require('@octokit/rest');
const octokit = new Octokit({ auth: process.env.GH_TOKEN });

async function listAndFilter() {
  const runs = await octokit.actions.listWorkflowRunsForRepo({
    owner: 'bitquan',
    repo: 'gosenderr',
    per_page: 100
  });
  console.log('total runs', runs.data.total_count);
  for (const r of runs.data.workflow_runs) {
    console.log(r.id, r.name, r.status, r.conclusion, r.completed_at);
  }
}

listAndFilter();
```

Run with `GH_TOKEN=<your_token> node scripts/test-cleanup.js` to see runs and test deletion logic locally before merging the scheduled workflow.

## How to review changes safely
- Work in a feature branch and open a PR (we created `ci/concurrency-fixes` and `ci/cleanup-workflow` already)
- Confirm PR checks: concurrency should cancel in-progress runs if you push rapidly
- Confirm that smoke workflows run only for their app paths
- Confirm Playwright E2E is gated (manual or after CI success)
- After merging the cleanup workflow to `main`, monitor the Actions page to validate it deletes completed runs after the configured time

---

If you'd like, I can also add a one-file checklist to the repo root (`.github/CI_CHECKLIST.md`) that summarizes these verification steps for reviewers.
