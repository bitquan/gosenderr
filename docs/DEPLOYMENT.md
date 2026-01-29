# Deployment (Draft)

## Sites and hosting
- `gosenderr-customer.web.app` — customer app
- `gosenderr-courier.web.app` — courier app
- `gosenderr-admin.web.app` — admin

## Deploy steps
- Build: `pnpm build`
- Deploy hosting: `firebase deploy --only hosting --project gosenderr-6773f`
- Deploy functions: `firebase deploy --only functions --project gosenderr-6773f`

## CI
- Use GitHub Actions to run tests, lint, and deploy on merged `main`.

(Expand with exact scripts and rollback/verification steps.)
