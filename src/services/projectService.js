/**
 * projectService.js
 * Manages the currently opened project state.
 * Central store for project root, file tree, and open editors.
 */

let projectRoot = null

export const projectService = {
  /**
   * Set the root folder of the current project
   * @param {string} rootPath
   */
  setRoot(rootPath) {
    projectRoot = rootPath
  },

  /**
   * Get the current project root path
   * @returns {string|null}
   */
  getRoot() {
    return projectRoot
  },

  /**
   * Check if a project is open
   * @returns {boolean}
   */
  isOpen() {
    return projectRoot !== null
  },

  /**
   * Get the project name (last segment of path)
   * @returns {string}
   */
  getName() {
    if (!projectRoot) return ''
    return projectRoot.split(/[\\/]/).filter(Boolean).pop()
  },

  /**
   * Close the current project
   */
  close() {
    projectRoot = null
  },
}
