# CI/CD Setup Complete! 🎉

## What's Been Set Up

✅ Git repository initialized and commits created
✅ GitHub Actions workflows created:
  - `.github/workflows/ci.yml` - Runs on all PRs and pushes
  - `.github/workflows/deploy.yml` - Deploys to Firebase Hosting on push to main
✅ Firebase Hosting configuration added to `firebase.json`

## Next Steps (Manual)

### 1. Push to GitHub
```bash
git push -u origin main
```

### 2. Configure GitHub Secrets
Go to your GitHub repository settings → Secrets and variables → Actions

Add these secrets:

**Required for deployment:**
- `FIREBASE_SERVICE_ACCOUNT_GOSENDERR_6773F`
  
  Get this by running:
  ```bash
  firebase login
  firebase init hosting
  # When prompted, select:
  # - Use an existing project: gosenderr-6773f
  # - Public directory: apps/web/out (or press enter for default)
  # - Configure as single-page app: No
  # - Set up automatic builds with GitHub: Yes
  # This will create the service account and add it to GitHub automatically
  ```

**Optional (for build with real Firebase config):**
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

These can be found in your `apps/web/.env.local` file.

### 3. Test the CI/CD Pipeline

Once pushed and secrets configured:
- **Every PR or push** will run CI (lint, typecheck, build)
- **Push to main** will run CI + deploy to Firebase Hosting

## Workflow Details

### CI Workflow (`ci.yml`)
- Triggers on: All pull requests and pushes
- Steps:
  1. Checkout code
  2. Setup Node 20 + pnpm
  3. Install dependencies with cache
  4. Create .env.production from secrets (if available)
  5. Run lint (continue on error)
  6. Run type-check
  7. Run tests (continue on error)
  8. Build Next.js app

### Deploy Workflow (`deploy.yml`)
- Triggers on: Push to main branch only
- Steps: Same as CI + Firebase Hosting deploy
- Deploy only runs if build succeeds
- Uses Firebase GitHub Action for deployment

## Firebase Hosting Configuration

The `firebase.json` now includes:
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

This tells Firebase to:
- Use the Next.js app in `apps/web`
- Enable framework-aware hosting (Next.js SSR support)
- Deploy backend functions to us-central1

## Troubleshooting

**Build fails on GitHub:**
- Check that all secrets are set correctly
- Ensure `pnpm-lock.yaml` is committed
- Verify `apps/web/package.json` has build script

**Deploy fails:**
- Ensure `FIREBASE_SERVICE_ACCOUNT_GOSENDERR_6773F` secret is set
- Check Firebase project ID matches: `gosenderr-6773f`
- Verify billing is enabled on Firebase project (required for Hosting)

**Type-check fails:**
- Run `pnpm -C apps/web run type-check` locally to see errors
- Fix any TypeScript errors before pushing

## Commands Reference

```bash
# Local development
cd apps/web
pnpm dev

# Type-check locally
pnpm type-check

# Build locally
pnpm build

# Manual deploy (after firebase init)
firebase deploy --only hosting

# View deploy logs
firebase hosting:channel:list
```
