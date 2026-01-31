# BUILD_GUIDE.md

Build and CI guidance for the Admin Desktop (Phase 1) Electron packaging.

## Build targets
- macOS: `.dmg` and `.app` via `electron-builder --mac`.
- Windows: `NSIS` installer `.exe` via `electron-builder --win`.

## Local build commands

From repo root (recommended):

```bash
pnpm --filter @gosenderr/admin-desktop build      # builds renderer + electron main
pnpm --filter @gosenderr/admin-desktop pack       # packaging output to dist-electron/ (no installer)
pnpm --filter @gosenderr/admin-desktop dist       # macOS: builds and opens the .dmg
```

Windows builds (use CI or a Windows VM):

```bash
cd apps/admin-desktop
pnpm build
pnpm exec electron-builder --win
```

## CI recommendations
- Use separate CI jobs for `macos-latest` and `windows-latest`.
- Build artifacts and run packaging smoke tests (launch the app headlessly to verify main window opens and a known endpoint responds).
- Upload artifacts to GitHub Releases / internal artifact store.

## Smoke tests
- After packaging, launch the built app and verify:
	- App opens without a white screen.
	- Login works and dashboard renders.
	- Global search opens with Cmd/Ctrl+K.
	- Open-in-new-window routes render correctly.

## Notes
- Cross-signing and notarization required for macOS distribution: plan to integrate codesign and notarization steps in CI after the first successful unsigned build.
