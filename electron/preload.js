const { contextBridge, ipcRenderer } = require('electron')

/**
 * Secure bridge between Renderer (React) and Main process (Node.js).
 * All exposed methods go through IPC — no direct Node access from renderer.
 *
 * Architecture:
 *   React → window.electronAPI.xxx() → ipcRenderer.invoke() → main.js handler → fs/pty
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Window Controls ───────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    new: () => ipcRenderer.send('window:new'),
    onMaximized: (cb) => ipcRenderer.on('window:maximized', (_, val) => cb(val)),
  },

  // ─── Dialogs ───────────────────────────────────────────────────
  dialog: {
    openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
    saveFile: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
  },

  // ─── File System ───────────────────────────────────────────────
  fs: {
    readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
    createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
    createFolder: (folderPath) => ipcRenderer.invoke('fs:createFolder', folderPath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    delete: (targetPath, isDir) => ipcRenderer.invoke('fs:delete', targetPath, isDir),
    exists: (targetPath) => ipcRenderer.invoke('fs:exists', targetPath),
    stat: (targetPath) => ipcRenderer.invoke('fs:stat', targetPath),
    watchDir: (dirPath) => ipcRenderer.invoke('fs:watchDir', dirPath),
    unwatchDir: (dirPath) => ipcRenderer.invoke('fs:unwatchDir', dirPath),
    onFileChange: (cb) => ipcRenderer.on('fs:fileChange', (_, event) => cb(event)),
  },

  // ─── Terminal ──────────────────────────────────────────────────
  terminal: {
    create: (id, cwd) => ipcRenderer.invoke('terminal:create', id, cwd),
    input: (id, data) => ipcRenderer.send('terminal:input', id, data),
    resize: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', id, cols, rows),
    kill: (id) => ipcRenderer.invoke('terminal:kill', id),
    onData: (cb) => ipcRenderer.on('terminal:data', (_, id, data) => cb(id, data)),
    onExit: (cb) => ipcRenderer.on('terminal:exit', (_, id, code) => cb(id, code)),
  },

  // ─── AI ────────────────────────────────────────────────────────
  ai: {
    sendMessage: (messages) => ipcRenderer.invoke('ai:sendMessage', messages),
    testConnection: () => ipcRenderer.invoke('ai:testConnection'),
    runAgent: (messages, workspace, sessionId) => ipcRenderer.invoke('ai:runAgent', messages, workspace, sessionId),
    
    startTask: (taskDescription, workspacePath) => ipcRenderer.invoke('ai:startTask', taskDescription, workspacePath),
    stopTask: () => ipcRenderer.invoke('ai:stopTask'),
    onOrchestratorEvent: (callback) => ipcRenderer.on('orchestrator:event', (event, data) => callback(data)),
    rollback: (checkpointId, workspace) => ipcRenderer.invoke('ai:rollback', checkpointId, workspace),

    // Events
    onOrchestratorStatus: (cb) => ipcRenderer.on('ai:orchestrator-status', (_, data) => cb(data)),
    onAgentStatus: (cb) => ipcRenderer.on('agent:status', (_, data) => cb(data)),
    onRequestPermission: (cb) => ipcRenderer.on('ai:request-permission', (_, data) => cb(data)),
    sendPermissionResponse: (id, allowed) => ipcRenderer.send('agent:permission-response', { id, allowed }),
    onFileChanged: (cb) => ipcRenderer.on('agent:file-changed', (_, data) => cb(data)),
    
    // Cleanup listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('ai:orchestrator-status');
      ipcRenderer.removeAllListeners('agent:status');
      ipcRenderer.removeAllListeners('ai:request-permission');
      ipcRenderer.removeAllListeners('agent:file-changed');
    }
  },

  // ─── Migration ──────────────────────────────────────────────────
  migration: {
    detect: () => ipcRenderer.invoke('migration:detect'),
    analyze: (installationId) => ipcRenderer.invoke('migration:analyze', installationId),
    execute: (analysis, workspace) => ipcRenderer.invoke('migration:execute', analysis, workspace),
    history: () => ipcRenderer.invoke('migration:history')
  },

  // ─── Updates ──────────────────────────────────────────────────────
  updater: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    onChecking: (cb) => ipcRenderer.on('update:checking', () => cb()),
    onAvailable: (cb) => ipcRenderer.on('update:available', (_, info) => cb(info)),
    onNotAvailable: (cb) => ipcRenderer.on('update:not-available', (_, info) => cb(info)),
    onError: (cb) => ipcRenderer.on('update:error', (_, err) => cb(err)),
    onProgress: (cb) => ipcRenderer.on('update:progress', (_, progressObj) => cb(progressObj)),
    onDownloaded: (cb) => ipcRenderer.on('update:downloaded', (_, info) => cb(info)),
  }
})
