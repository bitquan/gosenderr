# PR: Improve MapShell navigation, CTA gating & dev helpers

## Summary
This PR proposes an MVP navigation cleanup for MapShell and job flows to make the courier experience predictable and production-ready.

Key changes (proposal):
- Disable bottom-sheet swipe when viewing the active job (prevent accidental job switches).
- Add a visible `Back to Jobs` control when focused job === active job.
- Gate CTAs (disabled + helper text) when preconditions or in-flight work prevents the action.
- Keep `route_only` as a map display mode only — allow job browsing unless the active-job lock is present.
- Add a dev-only `Mock Move Forward` button on the panel to simulate location progress for testing.
- Improve proof-capture continuation: ensure attachProof immediately unlocks CTA / overlay state.

This PR will be split into small commits and unit tests so changes are reviewable.

---

## Motivation
- Current UX is developer-oriented and allows accidental navigation/actions.
- Couriers need a deterministic Active‑Job view and clear gating for status CTAs (proof/payment). 
- Dev helpers are useful but should be hidden/gated from production builds.

---

## Behavioral spec (MVP)
- Active Job locking
  - When focused job === `activeJob`, swiping the bottom card to other jobs is disabled.
  - A `Back to Jobs` control is shown to return to Dashboard/Job list.
- Route-only
  - `route_only` only affects map rendering; it must not implicitly hide job-browsing controls.
- CTA gating
  - CTAs are disabled (greyed) while: an update is in-flight, required proof/payment missing.
  - Show a short helper message explaining why the CTA is disabled.
- Proof flow
  - After `attachProof` completes (local or remote), re-evaluate overlay state so `Complete Delivery` becomes actionable immediately.
- Dev helper
  - Show `Mock Move Forward` on the bottom card when __DEV__ (or via dev feature flag).
  - The button advances location by one step of the route and updates overlay state.

---

## Files to change (implementation plan)
- src/screens/MapShellScreen.tsx
  - Change `canSwipeJobs` rule to only allow swiping when focusedJob.id !== activeJob.id
  - Add `Back to Jobs` button (panel header) and `Mock Move Forward` dev button
  - Gate CTAs and show helper text
  - Ensure post-`attachProof` overlay re-eval
- src/components/MapShellSurface.tsx
  - Ensure `route_only` remains display-only (no hiding of job-nav)
- src/services/locationService.ts
  - Add a dev-only helper to simulate advancing location (used by Mock Move)
- src/screens/__tests__/MapShellScreen.test.tsx
  - New tests: swipe-disabled for active job, `Back to Jobs` visibility, Mock Move behavior, CTA gating messages
- src/screens/JobDetailScreen.tsx
  - Ensure CTA gating consistency with MapShell (if needed)
- (optional) src/services/featureFlagsService.ts
  - Add dev flag `dev:mockMove` (if we want runtime toggle)

---

## Tests
- Unit tests for MapShell behavior (swipe gating, Back button, CTA states).
- Unit test for attachProof → immediate state re-eval (local fallback + Firebase write).
- Dev helper unit test for `Mock Move Forward`.

---

## QA / Manual test steps
1. Start emulator + seed jobs.
2. Accept a job → confirm Active Job view. Bottom card should NOT be swipeable; `Back to Jobs` is visible.
3. Toggle `route_only` — ensure map rendering changes but job navigation remains usable when unlocked.
4. On a proof_required job: Attach proof → `Complete Delivery` CTA becomes enabled and completes job.
5. In dev build: press `Mock Move Forward` and confirm overlay transitions (enroute → arrived → proof_required, etc.).

---

## Analytics / Telemetry
- Add events for `nav.back_to_jobs`, `cta.blocked_reason`, `dev.mock_move` to help monitor adoption and regressions.

---

## Follow-ups (next PRs)
- Replace inline proof data-URI persistence with Firebase Storage upload + job doc reference.
- Add emulator + CI integration test for Storage + proof flow.
- UX polish: confirmation modal for destructive transitions and refined copy.

---

## Acceptance criteria
- Unit tests added and passing for new behaviors.
- Active-job view prevents swipe; `Back to Jobs` exists and returns to the job list.
- CTAs show gating and helper text when blocked.
- Dev helper available only in dev builds/behind a flag.

---

Please review the plan and tell me what to change — I’ll implement edits as you direct and push a PR branch.

Requested reviewers: @product, @design, @mobile
