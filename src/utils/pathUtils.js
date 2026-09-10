/**
 * pathUtils.js
 * Cross-platform path utilities for use in the renderer process.
 */

/**
 * Get the filename from a full path
 * @param {string} filePath
 * @returns {string}
 */
export function basename(filePath) {
  return filePath.split(/[\\/]/).pop() || filePath
}

/**
 * Get the directory of a path
 * @param {string} filePath
 * @returns {string}
 */
export function dirname(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/')
  parts.pop()
  return parts.join('/') || '/'
}

/**
 * Join path segments
 * @param {...string} parts
 * @returns {string}
 */
export function joinPath(...parts) {
  return parts
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
}

/**
 * Get relative path from base
 * @param {string} base
 * @param {string} target
 * @returns {string}
 */
export function relativePath(base, target) {
  const b = base.replace(/\\/g, '/')
  const t = target.replace(/\\/g, '/')
  if (t.startsWith(b)) {
    return t.slice(b.length).replace(/^\//, '')
  }
  return t
}

/**
 * Get file extension (without dot)
 * @param {string} filePath
 * @returns {string}
 */
export function extname(filePath) {
  const name = basename(filePath)
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(idx + 1).toLowerCase() : ''
}

/**
 * Check if path is absolute (Windows or Unix)
 * @param {string} p
 * @returns {boolean}
 */
export function isAbsolute(p) {
  return /^([A-Za-z]:[\\/]|\/)/.test(p)
}

/**
 * Normalize path separators to forward slashes
 * @param {string} p
 * @returns {string}
 */
export function normalizePath(p) {
  return p.replace(/\\/g, '/')
}

/**
 * Validate a filename for invalid characters (Windows-safe)
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFilename(name) {
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Name cannot be empty' }
  }
  if (name.trim() !== name) {
    return { valid: false, error: 'Name cannot start or end with spaces' }
  }
  // Windows reserved characters
  const invalid = /[<>:"/\\|?*\x00-\x1f]/
  if (invalid.test(name)) {
    return { valid: false, error: 'Name contains invalid characters' }
  }
  // Windows reserved names
  const reserved = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
  if (reserved.test(name)) {
    return { valid: false, error: `"${name}" is a reserved system name` }
  }
  if (name.length > 255) {
    return { valid: false, error: 'Name is too long (max 255 characters)' }
  }
  return { valid: true }
}
