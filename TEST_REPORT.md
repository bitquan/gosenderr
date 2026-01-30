# TEST REPORT — feature/courier-turn-by-turn-navigation (read-only checks)

Date: 2026-01-27
Branch: feature/courier-turn-by-turn-navigation
Base: main

---

## 1) Build All Apps
Command run: `pnpm -w run build`

Result: FAILED (builds for several apps failed due to TypeScript errors)

Per-app summary:
- admin-app: FAILED
  - Errors: 68 TypeScript errors across 31 files (import.meta.env not typed, unused imports, missing types, third-party missing types)
  - Sample errors: Property 'env' does not exist on type 'ImportMeta' (src/lib/firebase.ts), missing module 'browser-image-compression'
- courier-app: FAILED
  - Errors: 59 TypeScript errors in 33 files (type mismatches, missing props, incorrect interfaces, mapbox types)
  - Sample errors: Type 'Promise<RouteData | undefined>' not assignable to 'Promise<RouteData>' in useMapboxDirections; mapbox types mismatch in MapboxMap
- marketplace-app: FAILED
  - Errors: 1 TypeScript error blocking build: Cannot find module '@/components/GlassCard' (src/components/DeliveryTypeSelector.tsx)
- shifter-app: FAILED
  - Errors: 40 TypeScript errors in 21 files (duplicate BottomNav declarations, missing modules, prop type mismatches)

Build times: Not available due to build failures (build aborted on first failing app in workspace run)

Bundle sizes: Not available (build did not complete successfully)

Conclusion: Build step failed — TypeScript errors are the immediate blocker. Fix these errors before merge.

---

## 2) Type-check
Command run: attempted `pnpm -w run type-check` and `pnpm -w exec tsc -b --noEmit`.

Result: No top-level `type-check` script. Running `tsc -b --noEmit` failed due to absent root tsconfig; per-package checks are performed during builds — errors surfaced during builds.

Recommendation: Add a workspace type-check script (or run `tsc --build` per-package) and fix TypeScript errors shown in build logs.

---

## 3) Test critical user flows (smoke & e2e dry-run)
- Customer smoke tests: Not run (builds failed; cannot reliably start previews)
- Vendor smoke tests: Not run (same reason)
- Courier app checks (manual smoke): Cannot verify dynamic map features without successful client build and preview server. Static checks: `capactor.config.ts` and `GoogleService-Info.plist` are present and appear valid.

---

## 4) iOS / Capacitor checks
- `apps/courier-app/capacitor.config.ts` present and valid (contains plugins config)
- `apps/courier-app/ios/App/App/GoogleService-Info.plist` present (contains API_KEY and GOOGLE_APP_ID)
- No corruption detected in Xcode project files from a quick read (files exist under ios/App.xcodeproj)

Note: Full iOS build/Archive requires macOS Xcode environment and was not performed here.

---

## 5) Firebase checks
- `firebase/functions/src/index.ts` exports appear correct (exports many functions and `* from ./stripe`)
- `firebase/firestore.rules` and `firebase.json` are present and readable (no syntactic issues observed in the rules file)

---

## 6) Recommendations & Next Steps
1. **Fix TypeScript build errors** on each failing app (admin, courier, customer, shifter). Some common categories:
   - `import.meta.env` typing — ensure types for Vite env are available (add `/// <reference types="vite/client" />` in relevant tsconfigs) or adjust tsconfigs.
   - Missing module imports (e.g., `@/components/GlassCard`) — verify file paths or exports.
   - Mapbox type mismatches — align route types and method signatures (resolve `Promise<RouteData | undefined>` vs `Promise<RouteData>`).
   - Duplicate declarations (BottomNav) — remove the duplicate or reconcile definitions.
2. Add a workspace `type-check` script to run TypeScript checks across packages or add CI step for `pnpm -w exec tsc --noEmit` per package.
3. Once builds pass locally, re-run the monorepo build and collect bundle sizes: `du -sh apps/*/dist` to compare.
4. Run smoke tests (Playwright) after starting preview servers for the built apps:
   - Start servers: `npx serve -s apps/<app>/dist -l <port>`
   - Run smoke tests (customer/vendor): `pnpm --filter @gosenderr/marketplace-app exec playwright test tests/e2e/customer/smoke --project=customer --config ../../playwright.ci.config.ts --grep-invert=@visual`
5. After fixes and successful builds/tests, create PR and run CI. Given current failures, hold merge until the TypeScript/build issues are resolved.

---

## Logs (errors only — trimmed)
See per-app summaries in the Build section above (admin/courier/customer/shifter errors). Full logs are available in the terminal session and can be saved to files if you want.

---

## Final recommendation
❌ Do NOT merge yet. Fix TypeScript/build errors and re-run the full test matrix. I'm happy to help fix the top errors or run further diagnostics.

-- end of report --
