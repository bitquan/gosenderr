This PR implements Phase 2 Lite (1 day scope) as requested.

Summary of actions:
1) Delete `apps/web/` entirely (site build and assets removed)
2) Move `apps/shifter-app/` to `apps/_archive/shifter-app/` (history preserved via git mv)
3) Delete root bloat files: `deploy-20260123-143440`, `test-apply-screenshot.png`
4) Add `.github/CODEOWNERS` (initial owners: @bitquan)

Files removed/moved (high-level):
- Deleted: apps/web/ (entire directory)
- Moved: apps/shifter-app/ -> apps/_archive/shifter-app/
- Deleted: deploy-20260123-143440
- Deleted: test-apply-screenshot.png
- Added: .github/CODEOWNERS

Verification performed locally:
- `pnpm install --frozen-lockfile` succeeded
- `pnpm build` ran but **failed** due to TypeScript errors in `@gosenderr/admin-app` (errors are unrelated to these deletions; see build logs).
  - Sample error: "Cannot find namespace 'JSX'" and missing test globals (e.g., `expect`) in admin-app tests.

Quick smoke test (manual):
- Start a dev server for marketplace app: `pnpm --filter @gosenderr/marketplace-app dev -- --host 127.0.0.1 --port 5180` and open `http://127.0.0.1:5180/`.

Important: This PR contains destructive changes. Per repo governance, human review and explicit approval are required before merging to main. Please review the archive and deletions carefully.
