# GoSenderr Developer Playbook

This is the repo-wide operating guide for developers.

If you follow this file exactly, you avoid the common setup and branch mistakes.

## 1) Canonical repo + apps

- Repo root:
  - `/Users/papadev/dev/apps/Gosenderr_Dev_Folder/gosenderr`
- Active apps:
  - `apps/marketplace-app`
  - `apps/senderr-app` (Senderr web)
  - `apps/courieriosnativeclean` (Senderr iOS native)
  - `apps/admin-app`
  - `apps/admin-desktop`
  - `apps/landing`
- Archive only:
  - `apps/_archive/*`

Do not do active work from archived paths.

## 2) First-time setup

Run from repo root:

```bash
pnpm install --frozen-lockfile
```

For Senderr iOS native:

```bash
pnpm run ios:senderr
```

This runs install checks and iOS setup.

## 3) Branch workflow (required)

Current app stream base branch:

- `senderr_app`

Start any new work:

```bash
git checkout senderr_app
git pull --ff-only origin senderr_app
git checkout -b <scope>/<short-task-name>
bash scripts/setup-branch-copilot.sh
```

Recommended branch scopes:

- `senderr-ios/*` for native iOS work
- `senderr/*` for Senderr web work
- `marketplace/*` for marketplace work
- `senderr-app/*` for repo/workspace/docs workflow work

## 4) Day-to-day git commands

Use branch helper commands from repo root:

```bash
bash scripts/git-branch-assist.sh status
bash scripts/git-branch-assist.sh sync
bash scripts/git-branch-assist.sh save "type(scope): short message"
```

## 5) Run each app

From repo root:

- Marketplace web:
  - `pnpm --filter @gosenderr/marketplace-app dev`
- Senderr web:
  - `pnpm --filter @gosenderr/senderr-app dev`
- Admin web:
  - `pnpm --filter @gosenderr/admin-app dev`
- Admin desktop:
  - `pnpm dev:admin-desktop`
- All web apps:
  - `pnpm dev`

## 6) Senderr iOS native workflow

Canonical project:

- Workspace: `apps/courieriosnativeclean/ios/Senderrappios.xcworkspace`
- Scheme: `Senderr`

Open in Xcode:

```bash
open apps/courieriosnativeclean/ios/Senderrappios.xcworkspace
```

Metro (for simulator/device):

```bash
cd apps/courieriosnativeclean
npx react-native start --reset-cache
```

Physical device:

- Keep phone and Mac on the same Wi-Fi.
- Set Metro host to your Mac LAN IP if needed.

## 7) CI + PR requirements

Before PR:

```bash
pnpm lint
pnpm type-check
pnpm build
```

For iOS branch work:

```bash
pnpm run ios:build:verify
```

Open PR to:

- `senderr_app` for current Senderr stream work

## 8) Common failures and exact fixes

`ERR_PNPM_NO_PKG_MANIFEST`:

- You are not in repo root.
- Fix:
  - `cd /Users/papadev/dev/apps/Gosenderr_Dev_Folder/gosenderr`

`No Podfile found`:

- You are in wrong iOS directory.
- Fix:
  - `cd apps/courieriosnativeclean/ios`

`The sandbox is not in sync with Podfile.lock`:

```bash
cd /Users/papadev/dev/apps/Gosenderr_Dev_Folder/gosenderr
pnpm run ios:clean:install
```

`No such module FirebaseCore` in Xcode:

- Pods are stale or workspace is wrong.
- Fix sequence:
  - `pnpm run ios:clean:install`
  - Open `.xcworkspace` (not `.xcodeproj`)

`Could not connect to localhost:8081` on phone:

- Metro not reachable from device.
- Fix:
  - Start Metro from `apps/courieriosnativeclean`
  - Use Mac LAN IP for Metro host on device

## 9) Source of truth docs

- Repo overview: `README.md`
- App docs index: `docs/apps/README.md`
- Senderr iOS docs: `docs/senderr_app/README.md`
- Minimal disk setup: `docs/dev/MINIMAL-SETUP.md`
