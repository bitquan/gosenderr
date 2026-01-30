# 🚀 GoSenderR - Run Tasks Guide

## Quick Start for Marketplace Development

### Option 1: VS Code Tasks (Recommended)

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux), then type "Tasks: Run Task":

#### Development Tasks
- **🛍️ Marketplace: Dev Mode** - Runs Customer App + Firebase Emulators
- **🔥 Start Firebase Emulators** - Run Firestore, Auth, Storage emulators
- **📦 Marketplace App** - Start marketplace app on port 5173
- **🔧 Admin App** - Start admin app on port 3000
- **⚡ Courier App** - Start courier app on port 5174

#### Build Tasks
- **🏗️ Build: Customer App** - Production build
- **🏗️ Build: All Apps** - Build all applications

#### Testing Tasks
- **🧪 Test: Customer App** - Run customer app tests
- **✅ Type Check: All** - TypeScript type checking

---

## Manual Commands

### Development

```bash
# Start Firebase Emulators (Required for local dev)
pnpm emulators

# Start Marketplace App (Marketplace)
pnpm --filter @gosenderr/marketplace-app dev

# Start Admin App
pnpm --filter @gosenderr/admin-app dev

# Start Courier App
pnpm --filter @gosenderr/courier-app dev

# Start ALL apps at once
pnpm dev
```

### Building

```bash
# Build customer app
pnpm --filter @gosenderr/marketplace-app build

# Build all apps
pnpm build:all
```

### Testing

```bash
# Run tests for marketplace app
pnpm --filter @gosenderr/marketplace-app test

# Type check all projects
pnpm type-check

# Lint all projects
pnpm lint
```

---

## Port Reference

| App | Port | URL |
|-----|------|-----|
| Marketplace App | 5173 | http://localhost:5173 |
| Admin App | 3000 | http://localhost:3000 |
| Courier App | 5174 | http://localhost:5174 |
| Shifter App | 5175 | http://localhost:5175 |
| Firebase Emulator UI | 4000 | http://localhost:4000 |
| Firestore Emulator | 8080 | - |
| Auth Emulator | 9099 | - |
| Storage Emulator | 9199 | - |

---

## Debugging

### VS Code Debugger

Press `F5` or use the Debug panel to launch:

- **🚀 Marketplace Dev** - Launches Customer App + Emulators together
- Individual app debuggers available

### Firebase Emulator UI

When emulators are running, access the UI at:
**http://localhost:4000**

Features:
- View Firestore data in real-time
- Manage Auth users
- View Storage files
- Check logs

---

## Common Issues

### Port Already in Use

```bash
# Kill all app ports
pnpm stop:all

# Or manually kill specific port
lsof -ti:5173 | xargs kill -9
```

### Firebase Emulators Not Starting

```bash
# Check if Java is installed (required for Firestore emulator)
java -version

# If not installed on Mac:
brew install openjdk@11
```

### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Or rebuild
pnpm build
```

### Module Not Found

```bash
# Reinstall dependencies
pnpm install

# Clear Turborepo cache
rm -rf .turbo
pnpm build
```

---

## Workflow for Marketplace Development

### 1. Start Development Environment

```bash
# Option A: Use VS Code Task
Cmd+Shift+P → "Tasks: Run Task" → "🛍️ Marketplace: Dev Mode"

# Option B: Manual
pnpm emulators &
pnpm --filter @gosenderr/marketplace-app dev
```

### 2. Open Browser

- Customer App: http://localhost:5173
- Firebase UI: http://localhost:4000

### 3. Make Changes

- Edit files in `apps/marketplace-app/src/`
- Hot reload will update browser automatically
- Check Firebase UI for data changes

### 4. Test Changes

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm --filter @gosenderr/marketplace-app test
```

### 5. Commit & Push

```bash
git add .
git commit -m "feat: your change description"
git push origin feat/marketplace-foundation-issue-58
```

---

## Environment Variables

Create `.env` files in each app:

### apps/marketplace-app/.env

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=gosenderr-6773f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gosenderr-6773f
VITE_FIREBASE_STORAGE_BUCKET=gosenderr-6773f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# For local emulators (optional)
VITE_USE_EMULATORS=true
VITE_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
VITE_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

---

## Tips & Tricks

### Fast Refresh

Changes to these files trigger instant updates:
- Component files (`.tsx`)
- CSS/Tailwind classes
- Most hooks and utilities

Full reload required for:
- `vite.config.ts`
- `.env` files
- Firebase config

### VS Code Shortcuts

- `Cmd+Shift+B` - Run default build task
- `F5` - Start debugging
- `Cmd+Shift+P` - Command palette (run any task)

### Turborepo Benefits

Turborepo caches build outputs:
- First build: Slower
- Subsequent builds: Much faster
- Shared packages automatically rebuild when changed

---

## Next Steps

Once running, proceed to:
1. ✅ Check marketplace home page renders
2. ✅ Test authentication flow
3. ✅ Verify Firebase Emulators work
4. ✅ Start implementing features from [Issue #58](https://github.com/bitquan/gosenderr/issues/58)
