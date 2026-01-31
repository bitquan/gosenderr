# Environment & Deployment Setup

This document describes how to safely manage development and production environments and how to deploy.

## Project aliases
We use Firebase project aliases to avoid accidentally deploying to production.

- `dev`: gosenderr-dev (placeholder)
- `staging`: gosenderr-staging (placeholder)
- `prod`: gosenderr-6773f (production)

These aliases are added to `.firebaserc` and referenced by the `package.json` scripts.

## Local environment files
- Copy `.env.example` to `.env.local` and fill in values for local development.
- Client-side variables must start with `VITE_` (e.g., `VITE_FIREBASE_PROJECT`).
- Never commit secrets to Git; use Firebase Secrets or CI secrets for production.

## Deploy scripts
Top-level `package.json` scripts added:

- `pnpm deploy:dev` — Build and deploy to the `dev` project
- `pnpm deploy:staging` — Build and deploy to the `staging` project
- `pnpm deploy:prod` — Build and deploy to `prod` (requires approval / careful use)

Examples:

```bash
# Deploy to dev
pnpm deploy:dev

# Deploy to prod
pnpm deploy:prod
```

## Safety tips
- Use `firebase use <alias>` to switch projects locally.
- Verify `firebase projects:list` to see available projects.
- For production secrets, use `firebase functions:secrets` or the Firebase console.
- Consider adding GitHub Actions protection for `deploy:prod` so it requires manual approval.

## CI guidance
- Add a workflow that only allows `deploy:prod` from the `main` branch and requires manual approval (`workflow_dispatch` or `environment` protection).
- Add a smoke test that runs against emulators for dev deployments.

If you want, I can open a PR now with these files and a GitHub Actions deploy workflow that requires manual approval for prod deploys.