# BAT-045 — Idempotency & Web Offline Command Queue

Status: in_progress
Priority: P1
Surface: Senderr Web + Backend (commands + token-wallet)

Summary
- Add idempotency keys to server-side lifecycle and token-wallet command handlers and implement a lightweight web offline command queue for reliable replay.
- Purpose: prevent duplicate side-effects on replay, enable safe offline-first UX, and satisfy SYSTEMS requirement for command queue idempotency.

Acceptance criteria
- Server callable handlers accept an optional idempotency key and use it to make ledger/command writes idempotent.
- Web client stores queued commands (IndexedDB/localStorage) when offline and replays them with idempotency keys when connectivity returns.
- Unit + integration tests for idempotency behavior (server and client replay).

Next actions (implementation plan)
1. Add optional `idempotencyKey` param to callables: `claimJob`, `updateJobStatus`, `adjustTokenWalletBalance`.
2. Server: persist idempotency records/ledger entries and make handlers return `duplicate: true` if replayed.
3. Client: implement minimal queue (persisted) + replay on online event and include idempotencyKey for each queued command.
4. Add tests and a small smoke script exercising offline replay.

Owner: Engineering
Estimate: 3 dev-days

References
- SYSTEMS: `SENDERR_SYSTEMS_MASTER_PLAN.md` (offline queue / idempotency guidance)
- Related BATs: `BAT-044` (lifecycle callable migration), `BAT-040` (token-wallet parity)
