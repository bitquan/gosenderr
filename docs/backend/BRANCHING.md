# Backend Branching Template

Use `backend/*` branches for backend scoped work.

## Branch naming

- `backend/feature/<short-name>`
- `backend/fix/<short-name>`
- `backend/docs/<short-name>`

## Scope guard

- Keep changes in:
  - `firebase/functions`
  - shared schema/contracts required for backend correctness
  - `docs/backend`

## Senderrplace V2 rule

- Marketplace/Senderrplace domain constraints must be server-enforced, not client-enforced.

