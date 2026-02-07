# GoSenderr Docs Blueprint

This file defines the repo documentation hierarchy, precedence, and archive policy.

## Canonical hierarchy

Use the following order of truth when docs conflict:

1. App-level operational docs in `apps/*/README.md`
- Source of truth for app setup, run, test, deploy, and troubleshooting.

2. Canonical repo docs in `docs/`
- Source of truth for shared architecture, development workflow, deployment, and process rules.
- Key docs:
  - `docs/BLUEPRINT.md`
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

## Ownership and review

- Canonical docs are owned by `CODEOWNERS`.
- Branch profile docs are owned by the branch author.
- Before merge, branch deltas must be:
  - promoted into canonical docs, or
  - removed if no longer needed.

Review checklist:
- Is the change reflected in canonical docs when required?
- Is branch-only behavior recorded in branch delta docs?
- Are links still valid?
- Are setup and verification commands still accurate?
