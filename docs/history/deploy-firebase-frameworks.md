# Firebase Hosting Deployment

## Overview

GoSenderr's Next.js web app (`apps/web`) is automatically deployed to Firebase Hosting on every push to `main`.

## Deployment Triggers

- **Push to `main`**: Runs CI (lint, typecheck, build) → deploys to Firebase Hosting (live)
- **Pull Request**: Runs CI only (no deployment)

## Required Secrets

GitHub repository secrets (already configured):

- `FIREBASE_SERVICE_ACCOUNT_GOSENDERR_6773F` - Service account for Firebase deployment
- Firebase project ID: `gosenderr-6773f`

## Workflow File

`.github/workflows/ci-and-deploy.yml`

### Jobs

1. **CI Job** (runs on all pushes and PRs):
   - Lints code with ESLint
   - Type-checks with TypeScript
   - Builds Next.js app

2. **Deploy Job** (only on push to main):
   - Deploys to Firebase Hosting using framework-aware hosting
   - Requires CI job to pass first
   - Uses `FIREBASE_CLI_EXPERIMENTS=webframeworks` for Next.js support

## Local Development & Deployment

### Build locally
```bash
cd apps/web
pnpm build
```

### Deploy manually
```bash
# From project root
firebase deploy --only hosting
```

### Check deployment logs
- GitHub Actions: https://github.com/bitquan/gosenderr/actions
- Firebase Console: https://console.firebase.google.com/project/gosenderr-6773f/hosting

## Firebase Configuration

### firebase.json
```json
{
  "hosting": {
    "source": "apps/web",
    "frameworksBackend": {
      "region": "us-central1"
    }
  }
}
```

Key settings:
- `source: "apps/web"` - Points to Next.js app in monorepo
- `frameworksBackend` - Enables Next.js SSR support with Cloud Functions

## Monorepo Notes

- Uses pnpm workspaces
- Workflow uses `pnpm -C apps/web` to run commands in the web app directory
- Firebase deployment action uses `entryPoint: apps/web` for monorepo support

## Troubleshooting

### Build fails in CI
1. Check GitHub Actions logs for the specific error
2. Run `pnpm -C apps/web build` locally to reproduce
3. Ensure all dependencies are in `apps/web/package.json`

### Deployment fails
1. Verify `FIREBASE_SERVICE_ACCOUNT_GOSENDERR_6773F` secret exists
2. Check Firebase Console for project permissions
3. Ensure billing is enabled (required for Cloud Functions/SSR)

### TypeScript errors
1. Run `pnpm -C apps/web type-check` locally
2. Fix errors before pushing to main
3. ESLint errors don't block builds (configured in `next.config.js`)

## Live Site

- Production: https://gosenderr-6773f.web.app
- Firebase Console: https://console.firebase.google.com/project/gosenderr-6773f
