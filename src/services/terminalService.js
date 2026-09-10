/**
 * terminalService.js
 * Manages terminal sessions (PTY instances).
 * Communicates with Electron main via window.electronAPI.terminal
 */

const api = window.electronAPI
let dataCallback = null
let exitCallback = null

// Register global listeners once
api.terminal.onData((id, data) => {
  if (dataCallback) dataCallback(id, data)
})
api.terminal.onExit((id, code) => {
  if (exitCallback) exitCallback(id, code)
})

export const terminalService = {
  /**
   * Create a new terminal session
   * @param {string} id - unique session ID
   * @param {string} cwd - working directory
   * @returns {Promise<{success: boolean, shell: string}>}
   */
  async create(id, cwd) {
    return await api.terminal.create(id, cwd)
  },

  /**
   * Send keyboard input to a terminal session
   * @param {string} id
   * @param {string} data
   */
  input(id, data) {
    api.terminal.input(id, data)
  },

  /**
   * Resize a terminal
   * @param {string} id
   * @param {number} cols
   * @param {number} rows
   */
  async resize(id, cols, rows) {
    return await api.terminal.resize(id, cols, rows)
  },

  /**
   * Kill a terminal session
   * @param {string} id
   */
  async kill(id) {
    return await api.terminal.kill(id)
  },

  /**
   * Register global data handler (all sessions share this)
   * @param {Function} cb - (id, data) => void
   */
  onData(cb) {
    dataCallback = cb
  },

  /**
   * Register global exit handler
   * @param {Function} cb - (id, exitCode) => void
   */
  onExit(cb) {
    exitCallback = cb
  },
}
