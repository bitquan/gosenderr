# GoSenderr Docs Blueprint

<<<<<<< HEAD
This file defines how documentation is organized and kept in sync across branches.

## Goals

- Keep one canonical source of truth.
- Keep branch docs focused on differences only.
- Make docs updates part of normal PR flow.

## Documentation model

1. Canonical docs (source of truth)
- Location: `docs/`
- Purpose: stable product, architecture, setup, and process rules.
- Key files:
  - `docs/BLUEPRINT.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/DEPLOYMENT.md`
  - `docs/apps/README.md` (app docs registry)

2. Branch docs (delta layer)
- Location: `.github/copilot/branches/*.md`
- Purpose: branch-specific scope, commands, and temporary deviations.
- Rule: branch docs never duplicate canonical docs; they only capture deltas.

## Branching documentation policy

- Every active branch must have one branch profile doc.
- New branch setup command:
  - `bash scripts/setup-branch-copilot.sh`
- Branch profile file name format:
  - `<branch-with-slashes-replaced-by-dashes>.md`
- Required sections in branch profile:
=======
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
>>>>>>> senderr_app
  - Intent
  - Scope
  - Canonical references
  - Branch deltas
  - Build and test commands
  - Done criteria

## PR documentation policy

<<<<<<< HEAD
- Every PR must explicitly declare docs impact:
  - `docs-impact: yes` when behavior/process/setup changed
  - `docs-impact: no` when no docs are affected
- If `docs-impact: yes`, update canonical docs first.
- If a branch introduces temporary behavior, record it in the branch profile delta section.

## Ownership

- Canonical docs are owned in `CODEOWNERS`.
- Branch profile docs are maintained by the developer working on that branch.
- Before merge, deltas should either:
  - be promoted into canonical docs, or
  - be removed if no longer needed.

## Review checklist

- Is the change reflected in canonical docs (if needed)?
- Is branch delta documented (if needed)?
- Are links in docs and sidebar still valid?
=======
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
>>>>>>> senderr_app
- Are setup and verification commands still accurate?
