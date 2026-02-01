# Conflict Resolution Guide — feature/courier-turn-by-turn-navigation → main

## Status
- Dry-merge performed; **no textual merge conflicts** were detected.

## When conflicts do occur (procedure)
1. Identify conflict files
   - Run: `git status --porcelain` or `git diff --name-only --diff-filter=U`
2. Classify severity
   - **Major**: conflicts in `src/` files affecting APIs, shared modules, or mobile Xcode project files — require code review and functional testing
   - **Minor**: conflicts in styles, docs, or generated assets — often resolved by taking one side or re-running build
3. Resolution strategy
   - For **major** conflicts:
     - Open both versions side-by-side (HEAD vs MERGE_HEAD)
     - Re-run unit tests and TypeScript checks locally after resolution
     - If Xcode project files conflict, prefer the feature branch's updated config but validate build in Xcode
   - For **minor** conflicts:
     - Prefer non-generated source code changes (authors' preference)
     - Rebuild assets and ensure no binary artifacts are checked in
4. Validate after resolution
   - Run `pnpm -w build` and `pnpm -w test`
   - Run important smoke tests and the Pre-Merge test checklist

## Notes for this merge
- Many changes are in `apps/courier-app` (new map & navigation code). If conflicts appear in shared UI components, coordinate with frontend owners to align props/signatures.

-- end --
