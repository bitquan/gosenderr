# Auth System

## Purpose
- Provide courier authentication via Firebase Auth while supporting mock/dev credentials when `SENDERR_ALLOW_MOCK_AUTH` is enabled.
- Keep session state in context so any screen can read the current user and refresh tokens without re-fetching from Firebase directly.

## Architecture & Flow
1. `AuthContext` (`src/context/AuthContext.tsx#L1-L220`) exposes `session`, `signIn`, and `signOut` hooks; it dispatches to either real Firebase or mock auth depending on runtime config.
2. `LoginScreen` (`src/screens/LoginScreen.tsx#L1-L200`) is a thin wrapper that renders the login form, handles dev autofill, and calls `signIn` from `AuthContext`.
3. `serviceRegistry` wires in the selected `authService` implementation so screens see a consistent API.

## Key entry points
- `AuthContext` provider – wraps `App` in `App.tsx` and exposes `useAuth()` for any screen to get the current session.
- `authService` (`src/services/authService.ts#L1-L220`) – dispatches to either Firebase or mock auth depending on runtime config supplied by `config/runtime.ts`.
- `LoginScreen` – user-facing entrypoint for entering credentials or using the mock cruise controls.

## Dependencies
- Firebase Auth for production credentials, plus `@react-native-async-storage/async-storage` for token persistence.
- Runtime config flags (mock auth toggles) read through `config/runtime.ts` so QA can bypass Firebase during rapid prototyping.

## Testing
- Login unit tests in `src/screens/__tests__/LoginScreen.test.tsx` mock `serviceRegistry` to return stubbed auth clients.
- `AuthContext` tests (if added) should mock `authService` to simulate success/failure flows.

## Current implementation notes
- `AuthContext` caches `session` and exposes `sessionValid` helpers for screens that need guard rails.
- Login screen includes quick-fill demo credentials (`courier@example.com / DemoPass123!`) behind the mock auth flag so developers can get in quickly.
- Any future MFA or SSO work should plug into `authService` (keeping `AuthContext`’s surface stable) and extend `LoginScreen` with new controls instead of rewriting the entire flow.