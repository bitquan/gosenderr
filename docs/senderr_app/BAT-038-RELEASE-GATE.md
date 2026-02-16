# BAT-038 Release Gate (Senderr Web MVP)

Date: 2026-02-16
Owner: Product + Engineering

## Automated Gate

Run from repo root:

```bash
pnpm run test:bat038
```

This target runs:

1. `pnpm --filter @gosenderr/senderr-app build`
2. `pnpm --filter @gosenderr/shared build`
3. `cd firebase/functions && pnpm build`

Gate rule: all three commands must pass before release approval.

## Manual Smoke Matrix (Required)

| ID | Flow | Steps | Expected Result | Status |
|---|---|---|---|---|
| M1 | Auth restore | Login → hard refresh → reopen app | Session restore works and protected route remains accessible | [ ] |
| M2 | Offer accept | Open feed → accept open job | Claim succeeds and job moves to assigned state | [ ] |
| M3 | Lifecycle sequence | assigned → enroute_pickup → arrived_pickup → picked_up → enroute_dropoff → arrived_dropoff → completed | Ordered transitions complete with correct UI state updates | [ ] |
| M4 | Offline resilience | Disconnect network during action → reconnect → retry | User sees clear offline error and retry succeeds when online | [ ] |
| M5 | Proof enforcement | Run pickup/dropoff proof-required transitions | Proof requirements are enforced and persisted | [ ] |
| M6 | Settings parity | Update profile basics + payout mode | Save succeeds and persists after refresh | [ ] |
| M7 | Wallet visibility | Review settings/dashboard wallet surfaces | Token wallet visibility matches payout mode | [ ] |
| M8 | Responsive shell | Validate phone/tablet/desktop shell/nav behavior | No navigation parity regressions across breakpoints | [ ] |
| M9 | Production safety | Visit live-host onboarding/payment-sensitive paths | Dev/mock paths are blocked on live host | [ ] |

Release rule: all M1–M9 must be checked before deploy.

## Rollback Runbook

Rollback triggers:

- auth/session restore regression on production
- lifecycle command failure spikes
- live environment safety guard bypass
- sustained critical errors in senderr flow

Rollback steps:

1. Pause deploy activity for senderr surfaces.
2. Identify last known-good commit/release.
3. Roll back hosting to last known-good release.
4. Roll back functions only when backend callables/http are implicated.
5. Re-run smoke checks M1, M2, M3, and M9.
6. Log rollback evidence in release notes before resuming changes.

## Deploy Checklist

Pre-deploy:

- [ ] Required PR checks are green
- [ ] `pnpm run test:bat038` passes
- [ ] Manual smoke matrix M1–M9 completed

Deploy:

- [ ] Deploy approved senderr web artifact
- [ ] Deploy functions if BAT scope changed backend behavior
- [ ] Confirm deploy output has no errors

Post-deploy:

- [ ] Re-run quick sanity (login, feed, one lifecycle progression, settings save)
- [ ] Confirm no critical error spikes in logs
