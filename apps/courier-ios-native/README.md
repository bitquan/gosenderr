# GoSenderr Courier V2 (Native iOS)

This is the native iOS courier app (Plan D). It runs alongside the current web courier app for a safe, feature‑flagged rollout.

## Quick Start

```sh
# From repo root
cd apps/courier-ios-native

# Start Metro
pnpm start
```

## iOS

```sh
# Install CocoaPods (if needed)
cd ios && pod install && cd ..

# Run iOS
pnpm ios
```

## Notes
- Bundle ID: `com.gosenderr.courier`
- Feature flags control access: `courier_native_v2_enabled`
- Blueprint: docs/project-plan/12-COURIER-V2-NATIVE-BLUEPRINT.md
