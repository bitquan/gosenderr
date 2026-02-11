# Navigation Worktree — Focused Development

This worktree is a focused development checkout for the **Navigation** feature. It contains only the files needed for working on Senderr and Courier native navigation to keep local development lightweight.

Included paths (sparse-checkout):
- apps/senderr-app
- apps/courieriosnativeclean
- packages/shared
- packages/ui
- docs/senderr_app
- scripts

Quick helpers (run from the `navigation` worktree root):
- `pnpm run start:web` — start Senderr web dev server (delegates to main workspace)
- `pnpm run start:metro` — start Metro for Courier app (delegates to app folder)
- `pnpm run ios` — start iOS simulator (delegates to main workspace)

Note: The scripts delegate to the main senderrplace-local workspace; they do not replace the monorepo's workspace configuration.

Branch policy: this worktree's branch (`senderr-app/feature/navigation`) is isolated for navigation changes only. Keep commits small and focused, and rebase on baseline when it updates.
