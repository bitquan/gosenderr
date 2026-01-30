# Dev Container (Node) for GoSenderr

This DevContainer is optimized for JavaScript/TypeScript development inside VS Code.

Quick start (VS Code):
1. Install Docker Desktop and ensure it is running.
2. Open this repository in VS Code.
3. Press F1 → Remote-Containers: Reopen in Container.
4. After the container builds, start the emulators with:

   docker-compose -f docker-compose.dev.yml up

5. In the container terminal, run `pnpm dev` for the app you want to work on.

Ports forwarded by the container:
- 5173 (marketplace dev)
- 5174 (courier dev)
- 4000 (Firebase Emulator UI)
- 8080 (Firestore)
- 9099 (Auth)
- 5001 (Functions)

Notes:
- iOS/Xcode work must be done on the host machine; this container does not run Xcode or simulators.
- Emulator data is persisted to `./firebase-emulator-data` in the repo.
