# Deployment (Draft)

## Sites and hosting
- `gosenderr-marketplace.web.app` — marketplace app
- `gosenderr-courier.web.app` — courier app
- `gosenderr-admin.web.app` — admin app
- `gosenderr-6773f.web.app` — landing site

## Deploy steps
- Build: `pnpm build`
- Deploy hosting: `firebase deploy --only hosting --project gosenderr-6773f`
- Deploy functions: `firebase deploy --only functions --project gosenderr-6773f`

## CI
- Use GitHub Actions to run tests, lint, and deploy on merged `main`.

(Expand with exact scripts and rollback/verification steps.)
