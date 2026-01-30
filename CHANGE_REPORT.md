# CHANGE_REPORT for feature/courier-turn-by-turn-navigation

## Summary
- Base: origin/main
- Feature: origin/feature/courier-turn-by-turn-navigation
- Divergence: main has 9 commits not in feature; feature has 10 commits not in main (see `git rev-list --left-right --count origin/main...origin/feature/...`).

## Files added (not present in main)
- .github/ISSUE_TEMPLATE/in-app-navigation-enhancement.md
- apps/courier-app/TESTFLIGHT_DEPLOYMENT.md
- apps/courier-app/dist/assets/index-CfZ-ZHgR.js (+ map assets)
- apps/courier-app/ios/App/App.xcodeproj/** (Xcode project/Workspace additions)
- apps/courier-app/src/components/BottomNav.tsx
- apps/courier-app/src/components/navigation/JobThumbnail.tsx
- apps/courier-app/src/contexts/NavigationContext.tsx
- apps/courier-app/src/hooks/useMapFocus.ts
- apps/courier-app/src/hooks/useMapboxDirections.ts
- apps/courier-app/src/pages/jobs/[jobId]/page.tsx
- apps/courier-app/src/pages/support/page.tsx
- apps/courier-app/src/lib/navigation/directions.ts
- apps/courier-app/src/lib/firebase.ts
- docs/COURIER_NAVIGATION_FEATURE_PLAN.md
- docs/IN_APP_NAVIGATION_PLAN.md

## Files modified
- .github/workflows/ci-and-deploy.yml (CI changes)
- apps/courier-app/{many files} (Map UI, navigation hooks, pages)
- apps/marketplace-app/src/pages/jobs/[jobId]/page.tsx (job UI updates)
- apps/marketplace-app/src/components/v2/MapboxMap.tsx (map changes)
- apps/admin-app/tsconfig.node.json
- many generated `dist/assets/*` files were renamed/updated

## Files deleted (observed in diff)
- Several `dist/assets/*` files (old build artifacts) replaced by new ones in the feature branch
- Note: I did **not** find a deletion of `apps/web/` in this diff; if that deletion was expected, confirm the commit/branch where it occurred.

## Potential breaking changes
- iOS project files added/modified — may require Xcode and CocoaPods adjustments, and will affect mobile CI
- Mapbox direction integration depends on Mapbox API keys and billing; ensure environment variables and billing are configured for staging/prod
- Navigation code (new contexts/hooks) may change component props/interfaces — run TypeScript checks and unit tests
- Any code that uses Firebase config must be verified (new `GoogleService-Info.plist` added to iOS project)

## Dependency changes
- No `package.json` or lockfile changes detected in `origin/main..origin/feature` diff (no new package upgrades detected). Please confirm if the feature branch intended to upgrade Vite or other deps in another commit.

## Notes & Recommendations
- Full build & test matrix is required (see PRE_MERGE_TESTS.md)
- Pay special attention to iOS build and TestFlight workflow (TestFlight metadata added)

-- end --
