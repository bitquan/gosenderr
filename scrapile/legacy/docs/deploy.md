# Deployment

## Current deployment path (recommended)
- Next.js SSR runs on Cloud Run (`gosenderr-web`, `us-central1`).
- Firebase Hosting remains the edge (custom domain) and proxies all requests to Cloud Run.

See: `docs/deploy/cloud-run.md`

## Historical docs
Old Firebase Hosting “frameworks preview” SSR notes were moved to `docs/history/deploy-firebase-frameworks.md`.
