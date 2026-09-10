/**
 * fileService.js
 * All file system operations go through this service.
 * Communicates with Electron main process via window.electronAPI.fs
 *
 * Prepared for AI agent integration (Step 2):
 * The AI agent will call these same methods via aiService → fileService.
 */

const api = window.electronAPI

export const fileService = {
  /**
   * Read directory tree recursively
   * @param {string} dirPath
   * @returns {Promise<FileNode[]>}
   */
  async readDir(dirPath) {
    return await api.fs.readDir(dirPath)
  },

  /**
   * Read file content as string
   * @param {string} filePath
   * @returns {Promise<{content: string, size: number}>}
   */
  async readFile(filePath) {
    return await api.fs.readFile(filePath)
  },

  /**
   * Write content to file (creates if not exists)
   * @param {string} filePath
   * @param {string} content
   * @returns {Promise<{success: boolean}>}
   */
  async writeFile(filePath, content) {
    return await api.fs.writeFile(filePath, content)
  },

  /**
   * Create a new empty file
   * @param {string} filePath
   * @returns {Promise<{success: boolean}>}
   */
  async createFile(filePath) {
    return await api.fs.createFile(filePath)
  },

  /**
   * Create a new folder
   * @param {string} folderPath
   * @returns {Promise<{success: boolean}>}
   */
  async createFolder(folderPath) {
    return await api.fs.createFolder(folderPath)
  },

  /**
   * Rename a file or folder
   * @param {string} oldPath
   * @param {string} newPath
   * @returns {Promise<{success: boolean}>}
   */
  async rename(oldPath, newPath) {
    return await api.fs.rename(oldPath, newPath)
  },

  /**
   * Delete a file or folder
   * @param {string} targetPath
   * @param {boolean} isDir
   * @returns {Promise<{success: boolean}>}
   */
  async delete(targetPath, isDir) {
    return await api.fs.delete(targetPath, isDir)
  },

  /**
   * Check if path exists
   * @param {string} targetPath
   * @returns {Promise<boolean>}
   */
  async exists(targetPath) {
    return await api.fs.exists(targetPath)
  },

  /**
   * Get file/folder stats
   * @param {string} targetPath
   * @returns {Promise<{isDirectory, isFile, size, mtime}>}
   */
  async stat(targetPath) {
    return await api.fs.stat(targetPath)
  },

  /**
   * Watch a directory for changes
   * @param {string} dirPath
   * @returns {Promise<void>}
   */
  async watchDir(dirPath) {
    return await api.fs.watchDir(dirPath)
  },

  /**
   * Stop watching a directory
   * @param {string} dirPath
   * @returns {Promise<void>}
   */
  async unwatchDir(dirPath) {
    return await api.fs.unwatchDir(dirPath)
  },

  /**
   * Register a callback for file system changes
   * @param {Function} callback - called with { type, path }
   */
  onFileChange(callback) {
    api.fs.onFileChange(callback)
  },
}
