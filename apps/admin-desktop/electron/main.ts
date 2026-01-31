import { app, BrowserWindow, Menu, dialog, session, shell, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let isQuitting = false
const logFile = path.join(app.getPath('userData'), 'admin-desktop.log')

function logError(message: string) {
  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`)
  } catch (error) {
    console.error('Failed to write log file:', error)
  }
}

async function clearAuthStorage() {
  try {
    await session.defaultSession.clearStorageData({
      storages: ['localstorage', 'indexdb', 'serviceworkers', 'cachestorage', 'websql']
    })
    console.log('✅ Cleared renderer storage (auto sign-out)')
  } catch (error) {
    console.error('Failed to clear renderer storage:', error)
  }
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
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
      label: 'File',
      submenu: [
        { role: 'close' }
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
          label: 'Support',
          click: async () => {
            await shell.openExternal('https://gosenderr.com')
          }
        },
        {
          label: 'Show Logs',
          click: async () => {
            await shell.openPath(logFile)
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

function showLoadError(details: string) {
  logError(details)
  dialog.showMessageBox({
    type: 'error',
    title: 'Admin Desktop Error',
    message: 'The app failed to load.',
    detail: details
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5176')
    mainWindow.webContents.openDevTools()
  } else {
    const appPath = app.getAppPath()
    const indexPath = path.join(appPath, 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const child = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    if (process.env.NODE_ENV === 'development') {
      child.loadURL(url)
    } else {
      const appPath = app.getAppPath()
      const indexPath = path.join(appPath, 'dist', 'index.html')
      const hash = new URL(url).hash || ''
      child.loadFile(indexPath, { hash })
    }

    return { action: 'deny' }
  })

  buildMenu()

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return
    const details = `Code: ${errorCode}\nDescription: ${errorDescription}\nURL: ${validatedURL}`
    console.error('did-fail-load:', details)
    showLoadError(details)
    mainWindow?.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    const info = `Reason: ${details.reason}\nExit code: ${details.exitCode}`
    console.error('render-process-gone:', info)
    showLoadError(info)
    mainWindow?.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      logError(`console[level=${level}] ${message} (${sourceId}:${line})`)
    }
  })

  mainWindow.webContents.on('did-finish-load', async () => {
    setTimeout(async () => {
      try {
        const hasContent = await mainWindow?.webContents.executeJavaScript(
          "document.body && document.body.innerText && document.body.innerText.trim().length > 0"
        )
        if (!hasContent) {
          const details = 'Detected empty renderer output (white screen).'
          console.error(details)
          showLoadError(details)
          mainWindow?.webContents.openDevTools({ mode: 'detach' })
        }
      } catch (error) {
        console.error('Failed to verify renderer content:', error)
      }
    }, 1000)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('close', async (event) => {
    if (isQuitting) return
    event.preventDefault()
    await clearAuthStorage()
    isQuitting = true
    mainWindow?.destroy()
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

app.on('before-quit', async () => {
  isQuitting = true
  await clearAuthStorage()
})

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url)
})