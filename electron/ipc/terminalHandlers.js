const { ipcMain } = require('electron')
const pty = require('node-pty')
const os = require('os')

// Active terminal sessions: id → { pty, win }
const sessions = new Map()

function getShell() {
  if (process.platform === 'win32') {
    // Prefer PowerShell, fallback to cmd
    try {
      require('child_process').execSync('where powershell', { stdio: 'ignore' })
      return { shell: 'powershell.exe', args: [] }
    } catch {
      return { shell: 'cmd.exe', args: [] }
    }
  }
  return { shell: process.env.SHELL || '/bin/bash', args: [] }
}

function registerTerminalHandlers(win) {

  // ─── Create terminal session ──────────────────────────────────
  ipcMain.handle('terminal:create', async (_, id, cwd) => {
    try {
      if (sessions.has(id)) {
        sessions.get(id).ptyProcess.kill()
        sessions.delete(id)
      }

      const { shell, args } = getShell()
      const workDir = cwd && require('fs').existsSync(cwd) ? cwd : os.homedir()

      const ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-color',
        cols: 120,
        rows: 30,
        cwd: workDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
        useConpty: true
      })

      ptyProcess.onData((data) => {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:data', id, data)
        }
      })

      ptyProcess.onExit(({ exitCode }) => {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:exit', id, exitCode)
        }
        sessions.delete(id)
      })

      sessions.set(id, { ptyProcess })
      return { success: true, shell }
    } catch (err) {
      throw new Error(`Cannot create terminal: ${err.message}`)
    }
  })

  // ─── Send input to terminal ───────────────────────────────────
  ipcMain.on('terminal:input', (_, id, data) => {
    const session = sessions.get(id)
    if (session) {
      session.ptyProcess.write(data)
    }
  })

  // ─── Resize terminal ──────────────────────────────────────────
  ipcMain.handle('terminal:resize', async (_, id, cols, rows) => {
    const session = sessions.get(id)
    if (session) {
      try {
        session.ptyProcess.resize(Math.max(cols, 10), Math.max(rows, 3))
      } catch (err) {
        // Ignore resize errors (can happen during startup)
      }
    }
    return { success: true }
  })

  // ─── Kill terminal session ────────────────────────────────────
  ipcMain.handle('terminal:kill', async (_, id) => {
    const session = sessions.get(id)
    if (session) {
      try {
        session.ptyProcess.kill()
      } catch {
        // Already dead
      }
      sessions.delete(id)
    }
    return { success: true }
  })
}

// Clean up all terminals on app exit
process.on('exit', () => {
  sessions.forEach(({ ptyProcess }) => {
    try { ptyProcess.kill() } catch {}
  })
})

module.exports = { registerTerminalHandlers }
