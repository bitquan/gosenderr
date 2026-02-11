# issue-265 Log

Last updated: 2026-02-09

## 2026-02-09

- Branch: `codex/issue-265-turn-by-turn-camera`
- Worktree: `issue-265`
- Issue/PR: Implement admin feature flag visibility for MapShell (delivery.mapShell)
- Scope: senderr-app Admin Feature Flags typing and UI exposure
- Files changed:
  - `apps/senderr-app/src/pages/AdminFeatureFlags.tsx`
- Commands run:
  - `bash scripts/worktree-sync.sh`
  - `pnpm --filter @gosenderr/senderr-app run lint -- src/pages/AdminFeatureFlags.tsx`
  - `pnpm --filter @gosenderr/senderr-app exec vitest src/__tests__/featureFlags.test.ts --run`
  - `git add && git commit -m "fix(senderr-app): surface delivery.mapShell in Admin Feature Flags" && git push origin codex/issue-265-turn-by-turn-camera`
- Test results: All relevant map-shell & feature flag tests passed locally (vitest).
- Follow-up: Consider importing `FeatureFlags` from `@gosenderr/shared` across other app-specific replicas to avoid type drift. Confirm admins can toggle `delivery.mapShell` in Firestore seed data if needed.
