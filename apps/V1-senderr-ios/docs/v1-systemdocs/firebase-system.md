# Firebase System

## Purpose
- Centralize Firebase initialization (Auth, Firestore, Storage, Messaging) so every service (`authService`, `jobsService`, `featureFlagsService`, etc.) relies on the same client instances and config.

## Architecture & Flow
1. `src/services/firebase.ts` exports `initializeFirebase` and `getFirebaseServices`; it wires core Firebase packages and guards repeated initialization ([src/services/firebase.ts#L1-L220]).
2. Runtime config reads `config/runtime.ts` so the app can toggle mock auth or point to different projects without code changes.
3. Adapters in `src/services/adapters` take Firebase handles and translate them into passive services consumed by feature flags, jobs, and auth logic.

## Key entry points
- `initializeFirebase` – invoked near App startup (e.g., `App.tsx` and `src/services/authService.ts`) to configure Firebase once.
- `getFirebaseServices` – lazy accessor for Firestore/Auth clients used by downstream services.
- Firebase config in `config/runtime.ts` determines project IDs, emulator ports, and whether mock auth is allowed.

## Dependencies
- Firebase JS SDK packages (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`).
- `@react-native-async-storage/async-storage` for persistence used by Firebase Auth under the hood.
- Native Firebase config file `GoogleService-Info.plist` for iOS builds.

## Testing
- Emulator-targeted tests (`src/services/__integration__/*`) rely on `pnpm exec firebase emulators:start --project gosenderr-6773f --only firestore,auth`.
- Unit tests mock `getFirebaseServices` when they don’t need real network behavior.

## Current implementation notes
- Services call `isFirebaseReady` before performing read/write operations.
- `firebase.ts` exports helper types so adapters and feature flags can request Firestore snapshots without duplicating initialization logic.
- Any future Firebase product addition (Crashlytics, Remote Config) should extend `initializeFirebase` and the adapters folder to keep dependencies consistent.