// Single Firebase initialization path for marketplace web.
// Keep this shim for backwards-compatible imports.
export { app, auth, db, storage, functions, isFirebaseReady } from "./firebase/client";
