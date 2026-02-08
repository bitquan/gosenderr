# App Docs Registry

This file maps each app to its canonical documentation location.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-08`
> - Review cadence: `monthly`

## Canonical app docs

- Senderrplace (current app path: `apps/marketplace-app`):
  - `apps/marketplace-app/README.md`
  - `apps/marketplace-app/copilot-instructions.md`
  - `docs/senderrplace/README.md`
- Senderr Web:
  - `apps/senderr-app/README.md`
  - `apps/senderr-app/copilot-instructions.md`
  - `docs/senderr_web/README.md`
  - Policy: replaces legacy courier web workflows
- Courier iOS Native:
  - `apps/courieriosnativeclean/README.md`
  - `docs/senderr_app/README.md`
- Admin Web:
  - `apps/admin-app/README.md`
  - `docs/admin_app/README.md`
- Admin Desktop:
  - `apps/admin-desktop/README.md`
  - `docs/admin_desktop/README.md`
- Landing:
  - `apps/landing/README.md`
  - `docs/landing/README.md`
- Backend (Firebase Functions + shared API contracts):
  - `firebase/functions/README.md`
  - `docs/backend/README.md`

## Rule

- App-level behavior/setup truth lives in these app docs.
- Branch profile docs in `.github/copilot/branches/` should only describe deltas from these app docs.
- Before creating a new branch/worktree profile, run:
  - `bash scripts/verify-app-templates.sh`
