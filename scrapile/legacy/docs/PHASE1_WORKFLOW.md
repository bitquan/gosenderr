# Phase 1 Admin Desktop - Development Workflow

## 🎯 Overview

Phase 1 focuses on building a native desktop admin application using Electron. This document describes the automated development workflow and available tools.

---

## 🚀 One-Command Startup

### Option 1: NPM Script (Recommended)

```bash
# Start all Phase 1 services
pnpm dev:admin-desktop

# Using Docker Compose instead
pnpm dev:admin-desktop:docker

# Stop all services
pnpm stop:admin-desktop
```

### Option 2: VS Code Tasks (Easiest)

1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Tasks: Run Task"
3. Select **"🎯 Phase 1: Admin Desktop Dev"**

This will automatically start all required services in the correct order with proper dependencies.

### Option 3: Direct Script

```bash
# From project root
./scripts/start-phase1.sh           # Native startup
./scripts/start-phase1.sh --docker  # Docker Compose
./scripts/start-phase1.sh --stop    # Stop all services
./scripts/start-phase1.sh --help    # Show usage
```

---

## 📦 What Gets Started

When you run the Phase 1 startup, these services launch **automatically** in this order:

1. **Firebase Emulators** (Auth, Firestore, Storage, Functions)
   - Emulator UI: http://localhost:4000
   - Firestore: http://localhost:8080
   - Auth: http://localhost:9099
   - Storage: http://localhost:9199

2. **Vite Dev Server** (hot-reload enabled)
   - Dev server: http://localhost:5176
   - Waits for emulators to be ready before starting

3. **Electron App** (native window)
   - Waits for Vite dev server to be ready
   - Loads http://localhost:5176 in Electron window
   - Native menus and keyboard shortcuts enabled

---

## 🛠️ Individual Service Control

### Start Services Individually

```bash
# Firebase Emulators only
./scripts/start-emulators.sh

# Vite dev server only (requires emulators running)
cd apps/admin-desktop
pnpm vite --port 5176 --host 127.0.0.1

# Electron app only (requires Vite running)
cd apps/admin-desktop
pnpm electron
```

### VS Code Tasks (Individual)

Available tasks in Command Palette (`Cmd+Shift+P` → "Tasks: Run Task"):

- **🔥 Firebase Emulators** - Start emulators only
- **🖥️ Admin Desktop: Vite Dev Server (Port 5176)** - Start Vite only
- **🖥️ Admin Desktop: Electron App** - Start Electron only (requires Vite)
- **🎯 Phase 1: Admin Desktop Dev** - Start all services (compound task)
- **🛑 Stop All Apps** - Kill all services including Electron

---

## 📝 Development Workflow

### 1. Start Development

```bash
pnpm dev:admin-desktop
```

### 2. Make Code Changes

- Edit files in `apps/admin-desktop/src/`
- Vite will hot-reload changes automatically
- Electron will reflect updates immediately (no restart needed)

### 3. Test Changes

- Admin Desktop app opens in Electron native window
- Use browser DevTools: `View → Toggle Developer Tools` (or `Cmd+Option+I`)
- Check Firebase data: http://localhost:4000

### 4. Debug Issues

**View Logs:**
```bash
# Vite dev server logs
tail -f logs/vite.log

# Firebase emulator logs
# (output to terminal when running natively)
```

**Check Running Services:**
```bash
# List all Phase 1 processes
lsof -i :4000 -i :5176 -i :8080 -i :9099 -i :9199
```

**Kill Stuck Processes:**
```bash
pnpm stop:admin-desktop
# Or manually:
pkill -f "electron.*admin-desktop"
lsof -ti:5176 | xargs kill -9
```

### 5. Stop Development

```bash
pnpm stop:admin-desktop
# Or press Ctrl+C in the terminal running start-phase1.sh
```

---

## 🐳 Docker Compose Mode

### When to Use Docker

- Reproducible environment across team members
- Easier Firebase emulator setup (no local Java required)
- Containerized services for consistency

### Limitations

- Electron **must** run natively (not in Docker)
- Slightly slower hot-reload compared to native
- Requires Docker Desktop installed and running

### Docker Workflow

```bash
# Start Firebase and Vite in Docker
pnpm dev:admin-desktop:docker

# In another terminal, start Electron natively
cd apps/admin-desktop
pnpm electron

# Stop Docker services
docker compose down
```

**Note:** The Docker setup automatically starts `firebase-emulator` and `admin-desktop` (Vite) services. You still need to run Electron natively in a separate terminal.

---

## 🔧 Troubleshooting

### Problem: "Port 5176 already in use"

**Solution:**
```bash
# Kill the process using the port
lsof -ti:5176 | xargs kill -9
# Or use the stop script
pnpm stop:admin-desktop
```

### Problem: "Firebase emulators won't start"

**Solution:**
```bash
# Check if Java is installed (required for emulators)
java -version

# Kill existing emulator processes
lsof -ti:4000,8080,9099,9199 | xargs kill -9

# Restart emulators
./scripts/start-emulators.sh
```

### Problem: "Electron shows blank screen"

**Solutions:**
1. Make sure Vite dev server is running first: http://localhost:5176
2. Check if `apps/admin-desktop/.env.local` exists (copy from `.env.example`)
3. Clear Electron cache:
   ```bash
   rm -rf ~/Library/Application\ Support/admin-desktop
   ```
4. Restart Electron:
   ```bash
   cd apps/admin-desktop
   pnpm electron
   ```

### Problem: "Can't connect to Firestore"

**Solutions:**
1. Verify emulators are running: http://localhost:4000
2. Check `apps/admin-desktop/.env.local` has:
   ```
   VITE_USE_EMULATOR=false
   ```
   (Electron uses Firebase CLI config, not emulator connection strings)
3. Verify `firebase.json` has correct emulator ports

### Problem: "Changes not hot-reloading"

**Solutions:**
1. Restart Vite dev server: `pnpm stop:admin-desktop && pnpm dev:admin-desktop`
2. Hard reload in Electron: `Cmd+Shift+R` (macOS) or `Ctrl+Shift+R` (Windows)
3. Check Vite config for HMR settings in `apps/admin-desktop/vite.config.ts`

---

## 📊 Service URLs Reference

| Service | URL | Purpose |
|---------|-----|---------|
| **Admin Desktop** | Electron Window | Native app (loads Vite dev server) |
| **Vite Dev Server** | http://localhost:5176 | Hot-reload, HMR, dev build |
| **Firebase Emulator UI** | http://localhost:4000 | View emulator data, logs, exports |
| **Firestore Emulator** | http://localhost:8080 | Database operations |
| **Auth Emulator** | http://localhost:9099 | Authentication testing |
| **Storage Emulator** | http://localhost:9199 | File uploads testing |
| **Functions Emulator** | http://localhost:5001 | Cloud Functions testing |

---

## 🎯 Phase 1 Goals

### Completed ✅
- [x] Electron app scaffolding (main, preload, menu)
- [x] Renderer migrated from admin-app (React + Vite)
- [x] Firebase emulator integration
- [x] Tailwind CSS styling
- [x] Feature flags UI with seed functions
- [x] Admin role verification (adminProfiles collection)
- [x] Automated startup workflow (tasks.json + scripts)

### In Progress 🚧
- [ ] Systematic page testing (Dashboard, Users, Orders, etc.)
- [ ] Native menu implementation (File, Edit, View, Help)
- [ ] Keyboard shortcuts (Cmd+R refresh, Cmd+Q quit)
- [ ] Error boundaries and error handling
- [ ] Offline mode indicator

### Upcoming 📅
- [ ] Real-time data updates (onSnapshot subscriptions)
- [ ] CRUD workflows (user edit/delete, seller approval)
- [ ] Bulk operations (batch user updates, export data)
- [ ] Search and filtering (global search, advanced filters)
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] macOS DMG installer build
- [ ] Windows NSIS installer build
- [ ] CI/CD pipeline for desktop builds

---

## 📚 Additional Resources

- **Phase 1 Plan:** `docs/project-plan/03-PHASE-1-ADMIN-DESKTOP.md`
- **Electron Setup:** `docs/project-plan/ELECTRON_SETUP.md`
- **Build Guide:** `docs/project-plan/BUILD_GUIDE.md`
- **Keyboard Shortcuts:** `docs/project-plan/SHORTCUTS.md`
- **General Development:** `docs/DEVELOPMENT.md`
- **API Reference:** `docs/API_REFERENCE.md`

---

## 💡 Pro Tips

1. **Use VS Code Tasks** - Easiest way to start/stop services (`Cmd+Shift+P` → "Tasks: Run Task")
2. **Keep Emulator UI Open** - http://localhost:4000 for debugging Firestore data
3. **Check Logs** - `logs/vite.log` for Vite errors, terminal for emulator logs
4. **Hot Reload** - Changes to React components auto-reload; menu changes require Electron restart
5. **Test in Browser First** - http://localhost:5176 for faster iteration before testing in Electron
6. **Use Feature Flags** - Wrap new features in flags for safe deployment and rollback
7. **Seed Test Data** - Run `pnpm dlx tsx scripts/seed-admin-data.ts` for sample data

---

**Questions or Issues?** Open a GitHub Discussion or check `docs/project-plan/README.md` for more details.
