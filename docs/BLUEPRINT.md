# GoSenderr Docs Blueprint

This file defines the repo documentation hierarchy, precedence, and archive policy.

> Doc metadata
> - Owner: `@bitquan`
> - Last verified: `2026-02-07`
> - Review cadence: `monthly`

## Canonical hierarchy

Use the following order of truth when docs conflict:

1. App-level operational docs in `apps/*/README.md`
- Source of truth for app setup, run, test, deploy, and troubleshooting.

2. Canonical repo docs in `docs/`
- Source of truth for shared architecture, development workflow, deployment, and process rules.
- Key docs:
  - `docs/BLUEPRINT.md`
  - `docs/DOCS_OWNERSHIP.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/DEPLOYMENT.md`
  - `docs/apps/README.md`
  - `docs/DEVELOPER_PLAYBOOK.md`

3. Branch delta docs in `.github/copilot/branches/*.md`
- Only branch-specific differences from canonical docs.
- Must not restate or fork canonical guidance.

4. Legacy planning docs in `docs/project-plan/`
- Historical planning artifacts and references.
- Not authoritative for current operational setup unless explicitly promoted.

## Legacy archive policy

`docs/project-plan/` is a legacy planning archive.

- Allowed:
  - Historical context
  - Prior plans and design snapshots
  - Migration notes
- Not allowed:
  - Overriding current setup/build/run/release instructions
  - Declaring itself as current global source of truth

When legacy guidance becomes current policy, copy it into canonical docs under `docs/` or `apps/*/README.md` and link the promoted section.

## Branch documentation policy

- Every active branch must have one branch profile doc.
- Initialize with:
  - `bash scripts/setup-branch-copilot.sh`
- Branch profile file naming:
  - `<branch-with-slashes-replaced-by-dashes>.md`
- Required sections:
  - Intent
  - Scope
  - Canonical references
  - Branch deltas
  - Build and test commands
  - Done criteria

## PR documentation policy

- Every PR must set docs impact:
  - `docs-impact: yes` when behavior/process/setup changes
  - `docs-impact: no` when no docs are affected
- If `docs-impact: yes`, update canonical docs in the same PR.
- If behavior is temporary to a branch, add it only to the branch profile delta section.

## Docs verification policy

`pnpm run verify:docs` is the required CI docs gate.

- Failing conditions in canonical docs:
  - `TODO` markers
  - broken local markdown links
- Canonical verification scope:
  - all markdown under `docs/`
  - excluding legacy archives:
    - `docs/project-plan/*`
    - `docs/archive/*`
- Legacy paths may contain planning TODOs, but those TODOs are not allowed in canonical docs.

## Verification metadata policy

Canonical docs should include a metadata block near the top:

```md
> Doc metadata
> - Owner: `@github-handle`
> - Last verified: `YYYY-MM-DD`
> - Review cadence: `weekly` | `monthly` | `quarterly`
```

Update `Last verified` when:

- setup/run/test/deploy instructions are touched
- workflow/process behavior changes
- ownership or review cadence changes

## Ownership and review

- Canonical docs ownership and cadence are tracked in `docs/DOCS_OWNERSHIP.md`.
- `CODEOWNERS` remains the merge gate owner-of-record.
- Branch profile docs are owned by the branch author.
- Before merge, branch deltas must be:
  - promoted into canonical docs, or
  - removed if no longer needed.

Review checklist:
- Is the change reflected in canonical docs when required?
- Is branch-only behavior recorded in branch delta docs?
- Are links still valid?
- Are setup and verification commands still accurate?
