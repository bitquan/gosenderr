# BUILD_GUIDE.md

Build and CI guidance for the Admin Desktop (Phase 1) Electron packaging.

## Build targets
- macOS: `.dmg` and `.app` via `electron-builder --mac`.
- Windows: `NSIS` installer `.exe` via `electron-builder --win`.

## Local build commands

From `apps/admin-desktop`:

```bash
pnpm build            # builds renderer + electron main
pnpm build:mac        # mac-specific packaging
pnpm build:win        # windows-specific packaging (use CI or VM to build Windows artifacts)
```

## CI recommendations
- Use separate CI jobs for `macos-latest` and `windows-latest`.
- Build artifacts and run packaging smoke tests (launch the app headlessly to verify main window opens and a known endpoint responds).
- Upload artifacts to GitHub Releases / internal artifact store.

## Smoke tests
- Run a minimal CLI smoke test that launches the built app and verifies it can reach a small `status` route (renderer should expose an internal health route when run with `--smoke-test` flag).

## Notes
- Cross-signing and notarization required for macOS distribution: plan to integrate codesign and notarization steps in CI after the first successful unsigned build.
