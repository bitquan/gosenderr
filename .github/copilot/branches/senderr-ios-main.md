# Branch Profile: `senderr-ios/main`

## Intent

- Branch mode: `mainline`
- Product area: `Senderr iOS Native`
- Role: stable branch for iOS native app fixes and releases.

## Scope

- Primary paths:
  - `apps/courieriosnativeclean/ios`
  - `apps/courieriosnativeclean` (native app config and JS entry points)
- Keep web-only courier changes in `senderr/*`.

## Build and test commands

- `cd apps/courieriosnativeclean/ios && pod install`
- Open and build:
  - `apps/courieriosnativeclean/ios/courieriosnativeclean.xcworkspace`
- Optional CLI build check:
  - `xcodebuild -workspace courieriosnativeclean.xcworkspace -scheme courieriosnativeclean -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

## Git workflow for this branch

- Commit messages should clearly mark iOS scope, for example:
  - `fix(senderr-ios): stabilize xcode script phase for debug builds`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "fix(senderr-ios): <summary>"`

## Done criteria

- Pod install succeeds.
- Xcode build path is verified for current change.

