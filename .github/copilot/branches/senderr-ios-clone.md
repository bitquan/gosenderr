# Branch Profile: `senderr-ios/clone`

## Intent

- Branch mode: `clone / experimental`
- Product area: `Senderr iOS Native`
- Role: iOS branch for trying risky pod/xcode/build-system changes.

## Scope

- Primary paths:
  - `apps/courieriosnativeclean/ios`
  - `apps/courieriosnativeclean`
- Keep experiments reversible and well documented.

## Build and test commands

- `cd apps/courieriosnativeclean/ios && pod install`
- Build in Xcode workspace:
  - `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Optional CLI build check:
  - `xcodebuild -workspace Senderrappios.xcworkspace -scheme Senderr -configuration Debug -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

## Git workflow for this branch

- Mark prototype intent in commit messages, for example:
  - `chore(senderr-ios-clone): test alternate pod post-install patching`
- Save and push:
  - `bash scripts/git-branch-assist.sh save "chore(senderr-ios-clone): <summary>"`

## Done criteria

- Prototype behavior is documented.
- Follow-up plan exists for promotion to `senderr-ios/main`.
