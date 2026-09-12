const { app, BrowserWindow, ipcMain, session, dialog, shell } = require('electron')
const path = require('path')

// Import IPC handlers
const { registerFileHandlers } = require('./ipc/fileHandlers')
const { registerTerminalHandlers } = require('./ipc/terminalHandlers')
const { registerDialogHandlers } = require('./ipc/dialogHandlers')
const { registerAIHandlers } = require('./ipc/aiHandlers')
const { registerExtensionHandlers } = require('./ipc/extensionHandlers')
const agentService = require('./services/agentService')
const permissionService = require('./services/permissionService')
const updateManager = require('./services/updateManager')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,           // Custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,        // Required for node-pty in renderer-adjacent processes
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: true,            // Force show window immediately
  })

  // Load Vite dev server or production build
  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Window is shown immediately now
  win.once('ready-to-show', () => {
    // nothing needed
  })

  // Handle window control IPC (custom title bar)
  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window:close', () => win.close())
  ipcMain.on('window:new', () => createWindow())

  // Send maximize state changes
  win.on('maximize', () => win.webContents.send('window:maximized', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized', false))

  return win
}

app.whenReady().then(() => {
  // Auto-allow permissions (like Microphone for WebRTC and Speech Recognition)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true)
  })
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true
  })

  // --- Shell ---
  ipcMain.handle('shell:openPath', async (_, targetPath) => {
    return await shell.openPath(targetPath)
  })

  const win = createWindow()

  // Register all IPC handlers
  registerFileHandlers()
  registerTerminalHandlers(win)
  registerDialogHandlers(win)
  registerAIHandlers(win)
  registerExtensionHandlers()

  agentService.setMainWindow(win)
  permissionService.setMainWindow(win)
  updateManager.setMainWindow(win)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Security: prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})
