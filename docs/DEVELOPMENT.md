# Development (Draft)

## Getting started
- Install pnpm, Node >=18, pnpm install
- Start emulators: `npx firebase emulators:start --only auth,firestore --project gosenderr-6773f`
- Start app dev servers (examples):
  - `pnpm --filter @gosenderr/marketplace-app dev -- --host 127.0.0.1 --port 5180`
  - `pnpm --filter @gosenderr/courier-app dev`

## Local checks
- Lint: `pnpm lint`
- Type-check per package: `pnpm --filter <pkg> tsc --noEmit` (or use `verify:phase0` script)
- E2E: Playwright config points to `http://127.0.0.1:5180` for the customer app.

## Common tasks
- Creating branches and PRs: follow `CONTRIBUTING.md` conventions
- Running unit tests: `pnpm test` (package-specific)

(Expand onboarding checklist and troubleshooting tips.)
