# Senderr App — Flow Audit Guide 🔎

This guide explains how to run periodic audits of the app's critical flows, report inconsistencies, and keep docs and code in sync.

## Purpose
- Regularly verify that critical user flows and developer docs match reality.
- Surface regressions early and keep documentation accurate.

## Cadence & Ownership
- **Cadence:** Monthly or quarterly depending on risk (start monthly for high-risk flows). Use a lightweight checklist per run.
- **Owners:** Assign a `CODEOWNERS` lead for the Senderr app who is responsible for the audit and creating issues for any drift found.

## Critical flows to audit (examples)
- Onboarding & sign-up
- Job creation & assignment
- Job acceptance & navigation
- Job completion & delivery confirmation
- Payment flow (checkout, refunds)
- Push notifications & delivery updates

## Audit checklist (per flow)
- [ ] Flow reproduces end-to-end without errors
- [ ] Automated smoke tests (if present) pass
- [ ] Documentation steps (README, API docs) match observable behavior
- [ ] Any UI text, screenshots, or steps that changed are updated in docs
- [ ] If behavior changed, a GitHub issue/PR is opened and assigned to an owner

## Tools & commands
- Verify docs: `pnpm run verify:docs`
- Spellcheck docs: `npx -y cspell "docs/**/*.md"`
- Run smoke tests: `sh scripts/smoke-tests.sh` (if applicable)

## Reporting & follow-up
- Create a short issue titled `Audit: <flow> - <YYYY-MM>` with results and attach failing steps or screenshots.
- Add label `audit` and assign to the `CODEOWNERS` lead.
- Close the issue when regressions are fixed and docs are updated.

---

Keep audits lightweight; the goal is prevention and timely fixes, not heavy process.