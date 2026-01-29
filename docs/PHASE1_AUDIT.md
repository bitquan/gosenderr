# Phase 1 — Documentation Audit

This file records a short audit of the `docs/` folder and recommendations for Phase 1 consolidation and archival.

Summary
- Goal: consolidate scattered docs into a small set of canonical docs for developer on-boarding and reference.

Recommended canonical docs to create (drafts added in this PR):
- `ARCHITECTURE.md` — high-level system architecture and app responsibilities
- `DEVELOPMENT.md` — local dev setup, running apps, emulators
- `DEPLOYMENT.md` — deployment process, CI, hosting targets
- `API_REFERENCE.md` — public/internal API surfaces and conventions (cloud functions, firestore collections)
- `COURIER_APP.md` — courier-specific design and implementation notes
- `MARKETPLACE_APP.md` — marketplace/customer-specific design and implementation notes

Suggested files to archive (move to `docs/archive/` after review):
- `finishtoday.md` — outdated checklist
- `ISSUE_33_README.md` — specific to a completed issue
- `POST_MERGE_VERIFICATION.md` — duplicates info now planned for `DEPLOYMENT.md`
- any feature-specific one-off notes that have canonical replacements

Next steps
1. Review drafts in this PR and accept / suggest changes.
2. Approve which files to move to `docs/archive/` and then move them in a follow-up commit to preserve history.
3. Add simple doc verification to CI (`verify:docs`) to ensure canonical docs exist and to run basic link/TODO checks.

Notes
- I created initial drafts for the canonical docs as skeletons — these will be filled in iteratively.
