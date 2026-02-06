# Branch Copilot Profiles

This directory stores branch-specific Copilot instruction files.

## Naming

- File name format: `<branch-name-with-slashes-replaced-by-dashes>.md`
- Example:
  - Branch: `marketplace/main`
  - Profile file: `.github/copilot/branches/marketplace-main.md`

## Current branch profiles

- `marketplace/main` -> `marketplace-main.md`
- `marketplace/clone` -> `marketplace-clone.md`
- `senderr/main` -> `senderr-main.md`
- `senderr/clone` -> `senderr-clone.md`
- `senderr-ios/main` -> `senderr-ios-main.md`
- `senderr-ios/clone` -> `senderr-ios-clone.md`

## New branch setup

For every new branch, run:

```bash
bash scripts/setup-branch-copilot.sh
```

This creates a branch profile in this folder using the same structure.

To make this automatic on branch create/switch, enable hooks once per clone:

```bash
bash scripts/enable-git-hooks.sh
```

## Optional git workflow helper

Use the branch-aware helper script:

```bash
bash scripts/git-branch-assist.sh setup
bash scripts/git-branch-assist.sh status
bash scripts/git-branch-assist.sh save "chore(scope): summary"
```
