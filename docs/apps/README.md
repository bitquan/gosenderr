# App Docs Registry

<<<<<<< HEAD
This file maps each active app to its canonical documentation location.

## Active apps (single source of truth)

- Marketplace Web:
=======
This file maps each app to its canonical documentation location.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-07`
> - Review cadence: `monthly`

## Canonical app docs

- Marketplace:
>>>>>>> senderr_app
  - `apps/marketplace-app/README.md`
  - `apps/marketplace-app/copilot-instructions.md`
- Senderr Web:
  - `apps/senderr-app/README.md`
  - `apps/senderr-app/copilot-instructions.md`
<<<<<<< HEAD
- Senderr iOS Native (single canonical native app):
  - `apps/courieriosnativeclean/README.md`
  - iOS project: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
  - scheme: `Senderr`
  - template source: `templates/ios/*`
  - bootstrap command: `pnpm run ios:bootstrap`
  - structure check: `pnpm run ios:check`
=======
- Courier iOS Native:
  - `apps/courieriosnativeclean/README.md`
>>>>>>> senderr_app
- Admin Web:
  - `apps/admin-app/README.md`
- Admin Desktop:
  - `apps/admin-desktop/README.md`
<<<<<<< HEAD
- Landing Web:
  - `apps/landing/README.md`

## Archived duplicates

Legacy iOS workspace-only duplicates are archived under:
- `apps/_archive/legacy-ios-workspaces/`

=======
- Landing:
  - `apps/landing/README.md`

>>>>>>> senderr_app
## Rule

- App-level behavior/setup truth lives in these app docs.
- Branch profile docs in `.github/copilot/branches/` should only describe deltas from these app docs.
