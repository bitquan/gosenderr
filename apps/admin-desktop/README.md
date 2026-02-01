# Admin Desktop

Electron-based desktop app for GoSenderr platform administrators (Phase 1).

## Quick Start

1. Install dependencies (from repo root):
   ```bash
   pnpm install
   ```

2. Run dev mode (starts Vite renderer + Electron):
   ```bash
   cd apps/admin-desktop
   pnpm dev
   ```

## Scripts
- `pnpm dev` - Run renderer + Electron in dev mode
- `pnpm build` - Build renderer and Electron main process
- `pnpm dist` - Package for distribution (macOS/Windows)

## Structure
- `electron/` - Main process, preload, and menu
- `src/` - React renderer (copied from admin-app)
- `electron-builder.yml` - Packaging configuration

See [docs/project-plan/03-PHASE-1-ADMIN-DESKTOP.md](docs/project-plan/03-PHASE-1-ADMIN-DESKTOP.md) for the full implementation plan.
