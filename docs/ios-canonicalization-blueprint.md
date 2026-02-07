# iOS Canonicalization Blueprint (Senderr)

Issue: #153

## Goal
Keep exactly one active iOS native app in the repo and make all scripts, docs, and CI point to it.

## Canonical App
- App path: `apps/courieriosnativeclean`
- iOS folder: `apps/courieriosnativeclean/ios`
- Xcode workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Xcode scheme: `Senderr`

## Problem Summary
Multiple iOS app directories create drift in Podfiles, scripts, and docs. This causes broken builds and unclear developer flow.

## Execution Plan
1. Inventory all iOS-like app directories under `apps/` and classify each one:
- `active`
- `candidate archive`
- `remove`

2. Lock canonical ownership:
- Keep only one active `Podfile` and one active workspace path.
- Point all iOS scripts to canonical path.
- Add CI guard that fails when more than one active iOS root is detected.

3. Archive legacy directories:
- Move legacy iOS directories under `apps/_archive/ios/`.
- Leave short README stubs at old paths with redirect instructions.

4. Align naming:
- Keep runtime-stable names first.
- Perform folder/scheme rename only after green CI and successful local build.

5. Validate:
- `pnpm install`
- `cd apps/courieriosnativeclean/ios && pod install`
- Build `Senderr` scheme in Xcode workspace.

## Dev Branch Rules
- Cleanup work branch: `codex/issue-153-ios-canonicalization`
- Feature/fix branches for this work must branch from that branch.
- Do not land unrelated product features in this branch.

## Done Criteria
- One active iOS app path.
- All scripts and CI use canonical path.
- Legacy copies archived or removed with redirects.
- Build and docs confirmed green.
