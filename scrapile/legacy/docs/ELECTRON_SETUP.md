# ELECTRON_SETUP.md

This document describes the basic Electron development setup for the Phase 1 Admin Desktop migration.

## Quickstart

1. Install deps at repo root:

   ```bash
   pnpm install
   ```

2. Start the renderer dev server (Vite) in one terminal:

   ```bash
   pnpm --filter @gosenderr/admin-desktop dev
   ```

3. Start Electron in a second terminal:

   ```bash
   pnpm --filter @gosenderr/admin-desktop electron
   ```

   In development, `electron/main.ts` loads `http://localhost:5176`.

4. (Optional) Use Firebase emulators for Admin Desktop:

   ```bash
   VITE_ADMIN_DESKTOP_USE_EMULATORS=true pnpm --filter @gosenderr/admin-desktop dev
   ```

   Admin Desktop defaults to production Firebase unless this flag is set.

## Security defaults and recommendations

- `contextIsolation: true` and `nodeIntegration: false` in BrowserWindow webPreferences.
- Expose a minimal IPC surface using a `preload.ts` with `contextBridge`.
- Avoid enabling remote module access; never pass user input into OS-level commands without strict validation.

## Routing in production

- The renderer uses HashRouter so that file:// routes work after packaging.
- The Vite base is set to `./` so assets resolve correctly from the `dist/` folder.

## Packaging & signing (macOS)

- Use `electron-builder` for packaging.
- Configure entitlements and hardened runtime for macOS builds.
- For CI, build on macOS runners (GitHub Actions) to sign and notarize artifacts.

## Troubleshooting

- If renderer dev server is unavailable in production build, verify `mainWindow.loadFile()` points to the correct dist `index.html` path.
- For missing icons, ensure you use absolute `__dirname` paths in the main process.
