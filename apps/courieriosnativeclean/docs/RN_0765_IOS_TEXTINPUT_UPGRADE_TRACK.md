# RN iOS TextInput Upgrade Track (0.76.5 baseline)

## Goal
Stabilize iOS TextInput behavior on physical devices (iOS 26.x), then upgrade React Native patch level with gated smoke checks.

## Baseline (must pass before upgrade)
- Release build installs to physical device.
- Sign-in screen accepts typed input without freeze.
- Fallback prompt path can complete sign-in if keyboard stalls.
- No `XPC connection interrupted` during normal sign-in.

## Branch + Scope
- Branch: `V1/senderrapp/local`
- Scope: `apps/courieriosnativeclean` only.

## Upgrade Steps
1. Record baseline versions:
   - `react-native@0.76.5`
   - `@react-native/*` packages aligned at `0.76.5`
2. Find latest compatible patch in RN 0.76 line.
3. Update:
   - `react-native`
   - `@react-native/babel-preset`
   - `@react-native/eslint-config`
   - `@react-native/metro-config`
   - `@react-native/typescript-config`
4. Reinstall dependencies and regenerate pods.
5. Run Hermes A/B device checks.

## Smoke Checklist (gate)
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm run ios:pods:hermes-on`
- [ ] `pnpm run ios:prod-run:hermes-on`
- [ ] Device sign-in works with typed email/password.
- [ ] `pnpm run ios:pods:hermes-off`
- [ ] `pnpm run ios:prod-run:hermes-off`
- [ ] Device sign-in works with Hermes off.
- [ ] No new crash/termination in Xcode device logs.

## Exit Criteria
- Same or better sign-in stability than baseline.
- No regressions in auth, map shell load, push token registration.
- Temporary keyboard diagnostics remain off by default.

## Rollback Plan
- Revert package and lockfile changes.
- Run `pnpm install`.
- Run `pnpm run ios:pods:hermes-on`.
- Rebuild Release and retest sign-in.
