# BAT-044 — Lifecycle Command Hardening

Status: in_progress
Priority: P0
Surface: Senderr Web + Backend (lifecycle)

Summary
- Migrate protected lifecycle command paths (claim job, update job status) from client-side Firestore transactions to server-side callable endpoints.
- Add server-side validation, idempotency readiness, and telemetry/audit trail for lifecycle commands. Remove client-side direct protected writes.

Problem
- SYSTEMS requires that protected lifecycle transitions MUST be executed and validated server-side. Currently `claimJob` and `updateJobStatus` are performed by the client via Firestore transactions which violates the contract and weakens auditability and idempotency guarantees.

Acceptance criteria
- New callable functions `claimJob` and `updateJobStatus` implemented in `firebase/functions` with equivalent validation/guards.
- `apps/senderr-app` no longer performs protected Firestore transactions for these commands — it calls the new callables instead.
- Firestore rules remain in place and prevent direct client writes for protected transitions.
- Unit tests added to verify handler exports and a smoke integration check (emulator) for the end-to-end callable path.
- Update docs/taskboard: BAT-044 created and marked `in_progress`.

Implementation plan
1. Add callable handlers in `firebase/functions/src/http/`:
   - `claimJob` (validates auth, job availability, courier eligibility, writes assigned state in transaction)
   - `updateJobStatus` (validates actor == assigned courier, validates transition, updates job status)
2. Export new handlers from `firebase/functions/src/index.ts`.
3. Replace client `claimJob` / `updateJobStatus` implementations in `apps/senderr-app/src/lib/v2/jobs.ts` to call callables via `httpsCallable`.
4. Add light unit tests in `firebase/functions/test/` to assert exports and basic handler existence.
5. Run `firebase/functions` build and `@gosenderr/senderr-app` build; run manual smoke on emulator.

Estimate: 2–4 dev-days (includes tests + emulator smoke validation)
Owner: Engineering
References
- SYSTEMS: `SYSTEMS/BACKEND_FUNCTIONS_SYSTEM.md`, `SYSTEMS/SENDERR_WEB_SYSTEM.md`
- Affected files: `apps/senderr-app/src/lib/v2/jobs.ts`, `firebase/functions/src/http/*`, `firebase/firestore.rules`

Next steps
- I implemented the callable handlers and migrated the client; running build + smoke now.
