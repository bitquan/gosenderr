# Branch Copilot Profiles

This directory stores branch-specific documentation profiles.

## Source-of-truth model

- Canonical docs live in `docs/` (start at `docs/BLUEPRINT.md`).
- Branch profile docs are delta docs only.
- Do not duplicate full canonical setup/process content inside branch docs.

## Naming

- File name format: `<branch-name-with-slashes-replaced-by-dashes>.md`
- Example:
  - Branch: `marketplace/main`
  - Profile file: `.github/copilot/branches/marketplace-main.md`

## Required sections

- Intent
- Scope
- Canonical references
- Branch deltas
- Build and test commands
- Done criteria

## New branch setup

For every new branch, run:

```bash
bash scripts/setup-branch-copilot.sh
```

To auto-create profiles on checkout/create, enable hooks once per clone:

```bash
bash scripts/enable-git-hooks.sh
```

## Optional git workflow helper

```bash
bash scripts/git-branch-assist.sh setup
bash scripts/git-branch-assist.sh status
bash scripts/git-branch-assist.sh save "chore(scope): summary"
```
