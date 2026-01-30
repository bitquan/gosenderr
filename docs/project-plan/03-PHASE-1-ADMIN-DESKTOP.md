# Phase 1: Admin Desktop App

**Duration:** 3-5 days  
**Status:** Planning  
**Priority:** High

---

## 📋 Overview

Convert the existing `apps/admin-app` (Vite + React) into a standalone Electron desktop application for macOS and Windows. This phase maintains all existing features while adding native desktop capabilities.

---

## 🎯 Scope

### Features to Keep (100%)
✅ **User Management**
- View all users (customers, sellers, couriers)
- Search and filter users
- Edit user profiles
- Assign/remove roles
- Ban/suspend users

✅ **Order Management**
- View all marketplace orders
- Filter by status, date, user
- Order details and timeline
- Cancel orders
- Issue refunds

✅ **Job Management**
- View all delivery jobs
- Real-time status monitoring
- Map view of active deliveries
- Reassign jobs to couriers
- View proof of delivery photos

✅ **Analytics**
- Platform metrics dashboard
- Revenue tracking (GMV, fees, payouts)
- User growth charts
- Order volume graphs
- Courier performance stats

✅ **Disputes**
- View open disputes
- Dispute details and evidence
- Message participants
- Resolve disputes
- Track resolution time

✅ **Feature Flags**
- Toggle platform features
- Enable/disable experimental features
- A/B testing configuration

✅ **Settings**
- Rate card configuration
- System settings
- Notification templates

### Features to Remove
❌ None - Keep everything

### New Desktop Features
🆕 **Native Capabilities**
- Native window controls (minimize, maximize, close)
- System tray integration
- Keyboard shortcuts
- File menu (Edit, View, Window, Help)
- Auto-updates (optional for v1)
- Offline detection
- macOS Touch Bar support (optional)

---

## 🏗️ Technical Details

### Electron Setup

**Electron Version:** 28.0.0+  
**Architecture:** Main process + Renderer process

```
apps/admin-desktop/
├── electron/
│   ├── main.ts              # Main process (Node.js)
│   ├── preload.ts           # Preload script (bridge)
│   └── menu.ts              # Native menu definition
├── src/                     # Renderer (React app)
│   ├── (copy all from admin-app/src/)
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── public/
│   └── icons/
│       ├── icon.icns        # macOS icon
│       ├── icon.ico         # Windows icon
│       └── icon.png         # Linux icon
├── electron-builder.yml     # Build configuration
├── package.json
├── tsconfig.json
└── vite.config.ts           # Vite config for Electron
```

---

### Main Process (electron/main.ts)

```typescript
import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import { createMenu } from './menu';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset', // macOS native look
    icon: path.join(__dirname, '../public/icons/icon.png')
  });

  // Load app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5176');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Set native menu
  const menu = createMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

---

### Preload Script (electron/preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  // Add IPC methods as needed
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url)
});
```

---

### Native Menu (electron/menu.ts)

```typescript
import { Menu, MenuItemConstructorOptions, BrowserWindow, shell } from 'electron';

export function createMenu(mainWindow: BrowserWindow): Menu {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'GoSenderr Admin',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+1',
          click: () => mainWindow.webContents.send('navigate', '/dashboard')
        },
        {
          label: 'Users',
          accelerator: 'CmdOrCtrl+2',
          click: () => mainWindow.webContents.send('navigate', '/users')
        },
        {
          label: 'Orders',
          accelerator: 'CmdOrCtrl+3',
          click: () => mainWindow.webContents.send('navigate', '/orders')
        },
        {
          label: 'Jobs',
          accelerator: 'CmdOrCtrl+4',
          click: () => mainWindow.webContents.send('navigate', '/jobs')
        },
        {
          label: 'Disputes',
          accelerator: 'CmdOrCtrl+5',
          click: () => mainWindow.webContents.send('navigate', '/disputes')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.gosenderr.com')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/bitquan/gosenderr/issues')
        }
      ]
    }
  ];

  return Menu.buildFromTemplate(template);
}
```

---

### Build Configuration (electron-builder.yml)

```yaml
appId: com.gosenderr.admin
productName: GoSenderr Admin
copyright: Copyright © 2026 GoSenderr

directories:
  output: dist-electron

files:
  - dist/**/*
  - electron/out/**/*
  - package.json

mac:
  category: public.app-category.business
  icon: public/icons/icon.icns
  target:
    - dmg
    - zip
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  hardenedRuntime: true
  gatekeeperAssess: false

dmg:
  title: GoSenderr Admin Installer
  icon: public/icons/icon.icns
  window:
    width: 540
    height: 380
  contents:
    - x: 140
      y: 200
      type: file
    - x: 400
      y: 200
      type: link
      path: /Applications

win:
  target:
    - nsis
    - portable
  icon: public/icons/icon.ico

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  installerIcon: public/icons/icon.ico
  uninstallerIcon: public/icons/icon.ico
  license: LICENSE

linux:
  target:
    - AppImage
    - deb
  icon: public/icons/
  category: Office
```

---

### Package.json Scripts

```json
{
  "name": "@gosenderr/admin-desktop",
  "version": "1.0.0",
  "main": "electron/out/main.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"electron electron/out/main.js\"",
    "dev:vite": "vite",
    "dev:electron": "tsc -p electron/tsconfig.json && electron electron/out/main.js",
    "build": "pnpm build:renderer && pnpm build:electron",
    "build:renderer": "vite build",
    "build:electron": "tsc -p electron/tsconfig.json",
    "build:mac": "pnpm build && electron-builder --mac",
    "build:win": "pnpm build && electron-builder --win",
    "build:linux": "pnpm build && electron-builder --linux",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.20.0",
    "firebase": "^10.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "concurrently": "^8.2.0",
    "typescript": "^5.3.0",
    "vite": "^6.0.0"
  }
}
```

---

## 📝 Implementation Steps

### Day 1: Project Setup

**Morning (4 hours):**
1. Create `apps/admin-desktop` folder
2. Set up Electron boilerplate:
   ```bash
   mkdir -p apps/admin-desktop/electron
   mkdir -p apps/admin-desktop/public/icons
   ```
3. Create `electron/main.ts`, `electron/preload.ts`, `electron/menu.ts`
4. Create `electron-builder.yml`
5. Update `package.json` with Electron dependencies
6. Create app icons for macOS (.icns) and Windows (.ico)

**Afternoon (4 hours):**
7. Configure Vite for Electron renderer process
8. Set up TypeScript configs (one for renderer, one for main process)
9. Test basic Electron window loads
10. Verify hot reload works in development

**Deliverable:** Empty Electron app window opens successfully

---

### Day 2: Migrate React Code

**Morning (4 hours):**
1. Copy entire `apps/admin-app/src/` to `apps/admin-desktop/src/`
2. Copy `apps/admin-app/index.html` to `apps/admin-desktop/`
3. Copy `.env.example` and create `.env.local`
4. Update imports if needed (Electron-specific paths)

**Afternoon (4 hours):**
5. Test all routes load correctly
6. Fix any build errors or missing dependencies
7. Verify Firebase connection works in Electron
8. Test user authentication flow

**Deliverable:** All admin features work in Electron window

---

### Day 3: Native Features & Menus

**Morning (4 hours):**
1. Implement native menu (File, Edit, View, Navigate, Window, Help)
2. Add keyboard shortcuts for navigation
3. Test menu items trigger correct routes
4. Add system tray icon (optional)

**Afternoon (4 hours):**
5. Implement IPC for external link opening
6. Add platform detection (show macOS vs Windows UI differences)
7. Test window state persistence (size, position)
8. Polish window controls and title bar

**Deliverable:** Native menus and shortcuts working

---

### Day 4: macOS Build & Testing

**Morning (4 hours):**
1. Build macOS app: `pnpm build:mac`
2. Test .app bundle locally
3. Fix any build errors or warnings
4. Test code signing (if applicable)

**Afternoon (4 hours):**
5. Create .dmg installer
6. Test installer flow (drag to Applications)
7. Test installed app opens and works correctly
8. Document any macOS-specific issues

**Deliverable:** Working macOS installer (.dmg)

---

### Day 5: Windows Build & Testing

**Morning (4 hours):**
1. Build Windows app: `pnpm build:win` (use VM or GitHub Actions)
2. Test .exe installer
3. Fix any Windows-specific issues
4. Test on Windows 10 and Windows 11

**Afternoon (4 hours):**
5. Create NSIS installer with proper UI
6. Test uninstaller
7. Verify app runs on fresh Windows install
8. Document build process for CI/CD

**Deliverable:** Working Windows installer (.exe)

---

## 🎨 Desktop-Specific UI Enhancements

### Keyboard Shortcuts
```
Navigation:
- Cmd/Ctrl+1: Dashboard
- Cmd/Ctrl+2: Users
- Cmd/Ctrl+3: Orders
- Cmd/Ctrl+4: Jobs
- Cmd/Ctrl+5: Disputes
- Cmd/Ctrl+6: Analytics

Actions:
- Cmd/Ctrl+F: Search
- Cmd/Ctrl+R: Refresh current view
- Cmd/Ctrl+,: Settings
- Cmd/Ctrl+Q: Quit

Window:
- Cmd/Ctrl+W: Close window
- Cmd/Ctrl+M: Minimize
- Cmd/Ctrl+Plus: Zoom in
- Cmd/Ctrl+Minus: Zoom out
```

### System Tray (Optional)
```typescript
import { Tray } from 'electron';

let tray: Tray | null = null;

function createTray() {
  tray = new Tray(path.join(__dirname, '../public/icons/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('GoSenderr Admin');
}
```

---

## 📦 Deliverables

### macOS
- **GoSenderr Admin.app** - Application bundle
- **GoSenderr Admin.dmg** - Installer disk image
- **GoSenderr Admin-mac.zip** - Portable zip

**Size:** ~120-150MB

### Windows
- **GoSenderr Admin Setup.exe** - NSIS installer
- **GoSenderr Admin.exe** - Portable executable

**Size:** ~150-200MB

### Documentation
- **ELECTRON_SETUP.md** - Development setup guide
- **BUILD_GUIDE.md** - Build instructions for CI/CD
- **SHORTCUTS.md** - Keyboard shortcuts reference

---

## ✅ Testing Checklist

### Functional Testing
- [ ] All routes accessible via menu
- [ ] Keyboard shortcuts work
- [ ] User management CRUD operations
- [ ] Order management features
- [ ] Job monitoring and reassignment
- [ ] Disputes workflow
- [ ] Analytics dashboard loads
- [ ] Search functionality
- [ ] Real-time updates (Firestore listeners)
- [ ] Firebase authentication

### Platform Testing
**macOS:**
- [ ] App opens on macOS 11+
- [ ] Native window controls work
- [ ] Cmd+Key shortcuts work
- [ ] Installer (.dmg) works
- [ ] App appears in Applications folder
- [ ] Uninstaller works (drag to Trash)

**Windows:**
- [ ] App opens on Windows 10/11
- [ ] Native window controls work
- [ ] Ctrl+Key shortcuts work
- [ ] Installer (.exe) works
- [ ] App appears in Program Files
- [ ] Uninstaller works (Control Panel)

### Performance Testing
- [ ] App launches in < 3 seconds
- [ ] Memory usage < 500MB idle
- [ ] CPU usage < 5% idle
- [ ] No memory leaks during extended use

---

## 🚨 Common Issues & Solutions

### Issue: Electron app won't build
**Solution:** Ensure `main` field in package.json points to `electron/out/main.js`

### Issue: Firebase doesn't connect
**Solution:** Check Content Security Policy in HTML. Add Firebase domains to CSP.

### Issue: React Router doesn't work
**Solution:** Use `HashRouter` instead of `BrowserRouter` for Electron

### Issue: External links don't open
**Solution:** Implement `shell.openExternal()` for all `<a target="_blank">` links

### Issue: Icons not showing
**Solution:** Use absolute paths with `__dirname` for icon files

---

## 📈 Success Criteria

- [ ] macOS app builds without errors
- [ ] Windows app builds without errors
- [ ] All existing features work
- [ ] Native menus implemented
- [ ] Keyboard shortcuts work
- [ ] Installers tested and working
- [ ] At least 2 admins using desktop app daily (post-launch)

---

## 🔄 Phase 1 Exit Criteria

**Ready to proceed to Phase 2 when:**
1. ✅ Admin desktop app builds on macOS
2. ✅ Admin desktop app builds on Windows
3. ✅ All existing admin features functional
4. ✅ Installers (.dmg + .exe) created and tested
5. ✅ Documentation complete
6. ✅ At least 1 admin using desktop app successfully

---

*This phase maintains feature parity while adding desktop capabilities. No features are removed or modified.*
