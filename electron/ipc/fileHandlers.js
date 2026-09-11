const { ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')
const chokidar = require('chokidar')

// Active watchers map: dirPath → watcher
const watchers = new Map()

function registerFileHandlers() {

  // ─── Read directory (recursive) ──────────────────────────────
  ipcMain.handle('fs:readDir', async (_, dirPath) => {
    try {
      return readDirRecursive(dirPath)
    } catch (err) {
      throw new Error(`Cannot read directory: ${err.message}`)
    }
  })

  // ─── Read file content ────────────────────────────────────────
  ipcMain.handle('fs:readFile', async (_, filePath) => {
    try {
      const stats = fs.statSync(filePath)
      // Limit file size to 10MB
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error('File is too large (>10MB) to open in editor')
      }
      const content = fs.readFileSync(filePath, 'utf8')
      return { content, size: stats.size }
    } catch (err) {
      throw new Error(`Cannot read file: ${err.message}`)
    }
  })

  // ─── Write file content ───────────────────────────────────────
  ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
    try {
      // Ensure parent directory exists
      const dir = path.dirname(filePath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, content, 'utf8')
      return { success: true }
    } catch (err) {
      throw new Error(`Cannot write file: ${err.message}`)
    }
  })

  // ─── Create new file ──────────────────────────────────────────
  ipcMain.handle('fs:createFile', async (_, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        throw new Error('File already exists')
      }
      const dir = path.dirname(filePath)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(filePath, '', 'utf8')
      return { success: true }
    } catch (err) {
      throw new Error(`Cannot create file: ${err.message}`)
    }
  })

  // ─── Create new folder ────────────────────────────────────────
  ipcMain.handle('fs:createFolder', async (_, folderPath) => {
    try {
      if (fs.existsSync(folderPath)) {
        throw new Error('Folder already exists')
      }
      fs.mkdirSync(folderPath, { recursive: true })
      return { success: true }
    } catch (err) {
      throw new Error(`Cannot create folder: ${err.message}`)
    }
  })

  // ─── Rename file or folder ────────────────────────────────────
  ipcMain.handle('fs:rename', async (_, oldPath, newPath) => {
    try {
      if (!fs.existsSync(oldPath)) {
        throw new Error('Source does not exist')
      }
      if (fs.existsSync(newPath)) {
        throw new Error('A file or folder with that name already exists')
      }
      fs.renameSync(oldPath, newPath)
      return { success: true }
    } catch (err) {
      throw new Error(`Cannot rename: ${err.message}`)
    }
  })

  // ─── Delete file or folder ────────────────────────────────────
  ipcMain.handle('fs:delete', async (_, targetPath, isDir) => {
    try {
      if (!fs.existsSync(targetPath)) {
        throw new Error('Target does not exist')
      }
      if (isDir) {
        fs.rmSync(targetPath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(targetPath)
      }
      return { success: true }
    } catch (err) {
      throw new Error(`Cannot delete: ${err.message}`)
    }
  })

  // ─── Check existence ──────────────────────────────────────────
  ipcMain.handle('fs:exists', async (_, targetPath) => {
    return fs.existsSync(targetPath)
  })

  // ─── Stat ─────────────────────────────────────────────────────
  ipcMain.handle('fs:stat', async (_, targetPath) => {
    try {
      const s = fs.statSync(targetPath)
      return {
        isDirectory: s.isDirectory(),
        isFile: s.isFile(),
        size: s.size,
        mtime: s.mtime.toISOString(),
      }
    } catch (err) {
      throw new Error(`Cannot stat: ${err.message}`)
    }
  })

  // ─── Watch directory ──────────────────────────────────────────
  ipcMain.handle('fs:watchDir', async (event, dirPath) => {
    if (watchers.has(dirPath)) return { success: true }
    const watcher = chokidar.watch(dirPath, {
      ignored: /(^|[/\\])\..|(node_modules)/,
      persistent: true,
      ignoreInitial: true,
      depth: 10,
    })
    const sender = event.sender
    const emit = (type, filePath) => {
      if (!sender.isDestroyed()) {
        sender.send('fs:fileChange', { type, path: filePath })
      }
    }
    watcher.on('add', (p) => emit('add', p))
    watcher.on('unlink', (p) => emit('unlink', p))
    watcher.on('addDir', (p) => emit('addDir', p))
    watcher.on('unlinkDir', (p) => emit('unlinkDir', p))
    watcher.on('change', (p) => emit('change', p))
    watchers.set(dirPath, watcher)
    return { success: true }
  })

  // ─── Unwatch directory ────────────────────────────────────────
  ipcMain.handle('fs:unwatchDir', async (_, dirPath) => {
    const watcher = watchers.get(dirPath)
    if (watcher) {
      await watcher.close()
      watchers.delete(dirPath)
    }
    return { success: true }
  })
}

/**
 * Recursively reads a directory and returns a tree structure.
 */
function readDirRecursive(dirPath, depth = 0) {
  if (depth > 10) return []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  return entries
    .filter(e => !e.name.startsWith('.') || e.name === '.env') // allow .env
    .filter(e => e.name !== 'node_modules' && e.name !== '.git') // exclude node_modules and .git
    .sort((a, b) => {
      // Folders first, then files, both alphabetical
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })
    .map(entry => {
      const fullPath = path.join(dirPath, entry.name)
      const isDir = entry.isDirectory()
      const node = {
        name: entry.name,
        path: fullPath,
        isDir,
      }
      if (isDir) {
        try {
          node.children = readDirRecursive(fullPath, depth + 1)
        } catch {
          node.children = []
          node.error = true
        }
      }
      return node
    })
}

module.exports = { registerFileHandlers }
