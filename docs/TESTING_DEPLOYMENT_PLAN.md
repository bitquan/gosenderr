# Testing + Deployment Plan (Emulator-First, Prod-Fix)

## Goal
Validate changes in emulators first, then ship minimal, safe fixes to production while Stripe stays in test mode.

## 1) Emulator Validation (every change)
- Start emulators (auth, firestore, storage).
- Seed demo data.
- Run smoke flow:
  - Marketplace home loads.
  - Item detail opens; view increment OK.
  - Add to cart.
  - Start chat; send message; see it in thread.
  - Checkout flow (Stripe test mode).
- Capture any errors (console + emulator logs) and fix locally.

## 2) Local Build Gate
- Build marketplace app (`pnpm --filter @gosenderr/marketplace-app build`).
- Do not deploy if build fails.

## 3) Production Deploy (small, targeted)
- Deploy hosting only:
  - `hosting:gosenderr-6773f`
  - `hosting:gosenderr-customer`
- Deploy Firestore rules only if emulator testing required a rules change.
- Keep Stripe in test mode until final sign-off.

## 4) Post-Deploy Checks (prod)
- Repeat smoke flow on live site.
- Verify no rules errors in console.
- If issues: hotfix locally → rebuild → redeploy hosting.

## 5) Rollback Plan
- Re-deploy the prior hosting version if needed.
- Keep rule changes minimal and reversible.

## Notes
- Main site now serves marketplace build.
- Admin hosting is kept but not deployed unless requested.
