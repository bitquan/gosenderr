# GoSenderr Docs Blueprint

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
  - Intent
  - Scope
  - Canonical references
  - Branch deltas
  - Build and test commands
  - Done criteria

## PR documentation policy

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
- Are setup and verification commands still accurate?
