Implementation notes — Improve MapShell navigation, CTA gating & proof Storage

Location: PRs/2026-02-13-improve-map-shell-navigation.md (draft)

Purpose
- Record the exact implementation details performed locally for review and for the PR you can open later.
- Include commands, tests, QA steps, and recommended PR description for copy/paste.

Summary of work completed (local)
- UI/UX
  - Disabled bottom-card swipe when `focusedJob === activeJob`.
  - Added `Back to Jobs` control (panel header) that returns to the job list.
  - Added CTA gating with helper copy for blocked reasons (proof missing, pending sync, working lock).
  - Added dev-only `Mock Move Forward` button in MapShell (calls `devMockAdvance`).
- Services
  - `attachProof` now uploads inline data-URLs / file URIs to Firebase Storage when available and stores the download URL in the job doc.
  - `getFirebaseStorage()` helper added to `src/services/firebase.ts` (lazy, safe to call when Firebase not configured).
  - Local fallback behavior unchanged: if Storage/upload not available, proof remains inline in job doc or persisted locally.
- Dev tooling / tests
  - Added `devMockAdvance()` to `locationService` for deterministic location simulation.
  - Unit tests added/updated: MapShell behavior, attachProof Storage upload, CTA gating.
- Design
  - Figma frames + tokens under `design/figmas/2026-02-13-navigation/`.

Files changed (detailed)
- src/screens/MapShellScreen.tsx — swipe lock, Back-to-Jobs, Mock Move Forward, CTA gating
- src/screens/__tests__/MapShellScreen.test.tsx — tests for new behavior
- src/services/locationService.ts — devMockAdvance helper
- src/services/jobsService.ts — attachProof Storage upload + safe fallbacks
- src/services/firebase.ts — getFirebaseStorage() helper
- src/services/__tests__/jobsService.test.ts — Storage upload coverage
- design/figmas/2026-02-13-navigation/* — SVG frames, tokens
- PRs/2026-02-13-improve-map-shell-navigation.md — PR draft (updated)

How to run locally (developer)
- Start Firebase emulator (uses workspace VS Code task):
  pnpm run emu:start:gosenderr   # or use VS Code task 2) Firebase Emu (Gosenderr)
- Seed jobs:
  pnpm run seed:emulator:replace (or use VS Code task 3)
- Start Metro and run iOS:
  npx react-native start --reset-cache
  npx react-native run-ios --scheme Senderr

Unit tests (fast verification)
- MapShell tests:
  pnpm test src/screens/__tests__/MapShellScreen.test.tsx -t "MapShellScreen panel layout"
- JobsService storage test:
  pnpm test src/services/__tests__/jobsService.test.ts -t "uploads inline proof to Firebase Storage"
- All tests:
  pnpm test

Manual QA steps (Storage + proof)
1. Start emulator + seed data.
2. Run app on simulator (dev build).
3. Accept a job and use `Mock Move Forward` (bottom card) to reach `arrived_dropoff` quickly.
4. Tap `Complete Delivery` — when proof required the `Attach dropoff proof` CTA is shown.
5. Capture a photo (simulator: use image picker if available or mock) and confirm `Complete Delivery` becomes enabled.
6. Verify Firestore (emulator): the job document `dropoffProof.url` should be a gcs/storage download URL if Storage was available; otherwise it may still be a data: URL in local fallback.

Notes on Storage/Emulator
- Firebase Storage emulator is not required for the unit tests (we mock storage operations). For end-to-end verification you can configure and run the Storage emulator and ensure the runtimeConfig points to the emulator bucket.

Suggested PR title & body (copy/paste)
- Title: Improve MapShell navigation, CTA gating and add proof Storage upload
- Body: See `PRs/2026-02-13-improve-map-shell-navigation.md` for full spec and Figma links. Implementation highlights:
  - Disabled bottom-sheet swipe for active-job view and added `Back to Jobs` control.
  - Added CTA gating + helper messaging for proof/payment/sync conditions.
  - Dev helper `Mock Move Forward` for deterministic QA.
  - `attachProof` upgraded to upload inline proof to Firebase Storage when available (safe local fallback retained).
  - Unit tests added for UI behaviors and Storage upload path.

Follow-ups (recommended)
- Add UI upload progress & retry and Storage integration test (emulator-backed).  
- Add telemetry for blocked CTA reasons and Back-to-Jobs event.  
- Consider retention/GC policy for proof images in Storage.

Ready actions (you)
- Tell me if you want me to push these local changes to a feature branch and open a PR remotely (I can do that next).
- Or request edits to the PR draft / design before I push.

---

Saved locally in `PRs/2026-02-13-improve-map-shell-navigation.md` and this implementation notes file.