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

Archived files (moved to `docs/archive/` in branch `docs/archive-phase1`):
- `finishtoday.md` — Outdated day-of checklist; replaced by general onboarding and maintenance guides.
- `ISSUE_33_README.md` — Issue-specific readme for a completed task.
- `POST_MERGE_VERIFICATION.md` — Duplicate of deployment / post-merge steps consolidated in `DEPLOYMENT.md`.
- `PR_11_DEPLOYMENT.md`, `PR_11_REVIEW.md` — PR-specific notes and artifacts.
- `VITE_MIGRATION_PLAN.md` — Large migration plan archived; key takeaways extracted into `DEVELOPMENT.md` as needed.
- `history/` (whole folder) — Archived checkpoint and historical docs; keep as read-only history.
- `github-actions-fixes/` — Workflow fixes and ad-hoc scripts archived (if needed for reproduction, they remain in archive).

Rationale: These documents are either historical, PR/issue-specific, or one-off migration notes. Archiving preserves history while keeping `docs/` focused on canonical, maintained references.

Next step: Open PR to review the archive move (branch `docs/archive-phase1`) and solicit quick approval; if approved, merge and link archived files from `PHASE1_AUDIT.md`.

