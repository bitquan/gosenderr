# Documentation Ownership and Verification

This file defines ownership, freshness tracking, and review cadence for canonical documentation.

## Metadata convention

Canonical docs should include this block near the top:

```md
> Doc metadata
> - Owner: `@github-handle`
> - Last verified: `YYYY-MM-DD`
> - Review cadence: `weekly` | `monthly` | `quarterly`
```

When docs are modified, update `Last verified` in that same PR.

## Ownership map (high-value docs)

| Document | Owner | Review cadence | Last verified |
| --- | --- | --- | --- |
| `README.md` | `@bitquan` | Monthly | 2026-02-07 |
| `docs/BLUEPRINT.md` | `@bitquan` | Monthly | 2026-02-07 |
| `docs/DEVELOPER_PLAYBOOK.md` | `@bitquan` | Monthly | 2026-02-07 |
| `docs/apps/README.md` | `@bitquan` | Monthly | 2026-02-07 |
| `docs/senderr_app/README.md` | `@bitquan` | Weekly | 2026-02-07 |
| `docs/senderrplace/README.md` | `@bitquan` | Weekly | 2026-02-08 |
| `docs/senderr_web/README.md` | `@bitquan` | Weekly | 2026-02-08 |
| `docs/admin_app/README.md` | `@bitquan` | Weekly | 2026-02-08 |
| `docs/admin_desktop/README.md` | `@bitquan` | Weekly | 2026-02-08 |
| `docs/landing/README.md` | `@bitquan` | Weekly | 2026-02-08 |
| `.github/WORKFLOWS.md` | `@bitquan` | Weekly | 2026-02-07 |

## Review operations

Weekly review:

1. Validate workflow and Senderr docs against current branch and CI behavior.
2. Update `Last verified` for docs actually checked.
3. Open issues for drift found during review.

Monthly review:

1. Validate repo-level setup and governance docs.
2. Confirm links and command examples still run.
3. Record updates in the same PR that fixes drift.

## Enforcement

- `CODEOWNERS` remains required for canonical docs changes.
- `pnpm run verify:docs` is required for every PR touching docs.
- Branch delta docs in `.github/copilot/branches/` cannot replace canonical docs.
