# App Docs Registry

This file maps each active app to its canonical documentation location.

## Active apps (single source of truth)

- Marketplace Web:
  - `apps/marketplace-app/README.md`
  - `apps/marketplace-app/copilot-instructions.md`
- Senderr Web:
  - `apps/senderr-app/README.md`
  - `apps/senderr-app/copilot-instructions.md`
- Senderr iOS Native (single canonical native app):
  - `apps/courieriosnativeclean/README.md`
  - iOS project: `apps/courieriosnativeclean/ios/Senderr.xcworkspace`
  - scheme: `Senderr`
  - template source: `templates/ios/*`
  - bootstrap command: `pnpm run ios:bootstrap`
  - structure check: `pnpm run ios:check`
- Admin Web:
  - `apps/admin-app/README.md`
- Admin Desktop:
  - `apps/admin-desktop/README.md`
- Landing Web:
  - `apps/landing/README.md`

## Archived duplicates

Legacy iOS workspace-only duplicates are archived under:
- `apps/_archive/legacy-ios-workspaces/`

## Rule

- App-level behavior/setup truth lives in these app docs.
- Branch profile docs in `.github/copilot/branches/` should only describe deltas from these app docs.
