# MERGE_PLAN: feature/courier-turn-by-turn-navigation → main

## Overview
This document outlines a safe, staged plan to merge the `feature/courier-turn-by-turn-navigation` branch into `main`.

## Quick summary of changes (high level)
- Adds turn-by-turn navigation and Mapbox Directions integration to `apps/courier-app`.
- New components and hooks in `apps/courier-app` (JobThumbnail, MapboxMap, useMapboxDirections, NavigationContext, etc).
- Documentation: `docs/IN_APP_NAVIGATION_PLAN.md` and ISSUE_TEMPLATE additions.
- Additions to iOS project files (TestFlight deployment metadata and Xcode project entries).
- Several changed files under `apps/customer-app` related to map components and job details.
- No `package.json` or dependency upgrades were detected in this diff.

> Important: The dry-merge produced **no textual conflicts**, but this is a *functional/semantic* merge. Please review the testing checklist below and validate runtime behavior (map, navigation, auth, iOS builds) before merging.

---

## Pre-merge checklist (run before any merge)
- [ ] Ensure `main` is protected and push access is guarded (required PR review)
- [ ] Backup `main` branch: `git branch backup/main-before-nav && git push origin backup/main-before-nav`
- [ ] Ensure `feature/courier-turn-by-turn-navigation` is up-to-date and tested locally
- [ ] Confirm `ci` and smoke tests pass on `feature` branch
- [ ] Verify all apps build successfully locally (see PRE_MERGE_TESTS.md)
- [ ] Confirm no outstanding uncommitted changes in working tree

---

## Merge process (recommended - interactive)
1. Fetch latest remote refs:
```bash
git fetch origin --prune
```
2. Ensure `main` is up to date and clean:
```bash
git checkout main
git pull origin main
```
3. Create a backup branch (safe restore point):
```bash
git branch backup/main-before-nav && git push origin backup/main-before-nav
```
4. Run a dry-merge to surface conflicts (no commit):
```bash
git merge --no-commit --no-ff origin/feature/courier-turn-by-turn-navigation || true
# Inspect for conflicts, then:
git merge --abort
```
5. If dry-merge had conflicts, resolve them on a temporary local branch and run tests (resolve, test, then merge). If no conflicts, proceed to create a merge PR.

6. Create a PR and run CI (do not merge until CI passes):
- Include the PR description with summary, testing steps, and risky files list.
- Add reviewers who are familiar with courier app and mobile iOS builds.

7. Once PR is reviewed & CI green, perform the merge from GitHub (prefer merge commit or squash per your policy), then run the post-merge checklist below.

---

## Post-merge checklist
- [ ] Run full monorepo build and tests on `main` (CI should do this automatically)
- [ ] Run e2e and smoke tests for customer, vendor, courier, admin
- [ ] Monitor production logs / error reporting (Sentry/Stackdriver) for at least 24–48 hours
- [ ] Verify mobile builds (iOS) if an app release is expected

---

## Potential risks & remediation steps
- Map/Route behavior: test many routes and edge cases (no route, long route, multiple waypoints)
- iOS project changes might require Xcode version adjustments — test archive and TestFlight flow
- If the merge introduces a regression: roll back using the backup branch and revert the merge commit

---

## Contact points
- Tag `@<owner>` and `@<mobile-owner>` for mobile/courier app verification

-- end --
