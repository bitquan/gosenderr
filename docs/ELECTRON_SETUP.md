# ELECTRON_SETUP.md

This document describes the basic Electron development setup for the Phase 1 Admin Desktop migration.

## Quickstart

1. Install deps at repo root:

   ```bash
   pnpm install
   ```

2. Create the Electron scaffold (if not present):

   ```bash
   mkdir -p apps/admin-desktop/electron
   cp -R apps/admin-app/src apps/admin-desktop/src
   ```

3. Install Electron tooling in the workspace `apps/admin-desktop`:

   ```bash
   cd apps/admin-desktop
   pnpm add -D electron electron-builder concurrently
   ```

4. Run dev mode (renderer + electron):

   ```bash
   pnpm dev
   ```

   In development, configure `electron/main.ts` to load `http://localhost:<renderer-port>`.

## Security defaults and recommendations

- `contextIsolation: true` and `nodeIntegration: false` in BrowserWindow webPreferences.
- Expose a minimal IPC surface using a `preload.ts` with `contextBridge`.
- Avoid enabling remote module access; never pass user input into OS-level commands without strict validation.

## Packaging & signing (macOS)

- Use `electron-builder` for packaging.
- Configure entitlements and hardened runtime for macOS builds.
- For CI, build on macOS runners (GitHub Actions) to sign and notarize artifacts.

## Troubleshooting

- If renderer dev server is unavailable in production build, verify `mainWindow.loadFile()` points to the correct dist `index.html` path.
- For missing icons, ensure you use absolute `__dirname` paths in the main process.
