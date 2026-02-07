# iOS cleanup & Xcode setup (quick guide)

Short checklist to free space and make builds faster for local development.

Quick safe actions (fast):

- Remove project DerivedData for `Senderr`: `./scripts/ios-clean-deriv.sh` (interactive)
- Prune pnpm store: `./scripts/cleanup-pnpm.sh --prune`
- List simulator sizes: `./scripts/cleanup-simulators.sh --list`

Recommended Xcode settings for local dev:

- Debug configuration: set `ONLY_ACTIVE_ARCH = YES` (improves simulator build times and avoids needing fat libs).
  - You can use `apps/courieriosnativeclean/ios/LocalDebug.xcconfig` and attach it to the Debug configuration in Xcode's project settings.
- Set 'Build Active Architecture Only' = YES for Debug in Xcode project build settings (optional if you use the xcconfig).
- Consider moving DerivedData to a fast external SSD if disk-limited: `Xcode Preferences → Locations → Derived Data → Advanced` (choose custom path).

Maintenance tips:

- Periodically run `./scripts/ios-clean-deriv.sh --all --yes` during low activity to reclaim space.
- Use `pnpm store prune` regularly.
- Delete old Xcode Archives (`~/Library/Developer/Xcode/Archives`) if disk space is constrained.

If you want, I can run the safe clean steps (remove Senderr DerivedData and run pnpm prune) now — tell me which ones to run.
