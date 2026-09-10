/**
 * aiService.js
 * ─────────────────────────────────────────────────────────────
 * RESERVED FOR STEP 2 — DeepSeek AI Agent Integration
 * ─────────────────────────────────────────────────────────────
 *
 * This stub defines the interface that the AI agent will use
 * to interact with the IDE in Step 2.
 *
 * The agent will call these methods to:
 *  - Read and understand the project structure
 *  - Modify files intelligently
 *  - Run commands in the terminal
 *  - Provide code suggestions and fixes
 *
 * DO NOT implement yet — just the interface spec.
 */

export const aiService = {
  // ─── File Operations (will delegate to fileService) ────────────

  /** Read a file and return its content */
  async read_file(filePath) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** Write content to a file */
  async write_file(filePath, content) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** Edit a specific section of a file */
  async edit_file(filePath, startLine, endLine, newContent) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** Create a new file */
  async create_file(filePath, content = '') {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** Delete a file */
  async delete_file(filePath) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** List all files in the project */
  async list_files(dirPath) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** Search for a pattern in all files */
  async search_code(query, options = {}) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  // ─── Terminal Operations ────────────────────────────────────────

  /** Run a shell command and return output */
  async run_command(command, cwd) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  // ─── DeepSeek API ──────────────────────────────────────────────

  /** Send a message to DeepSeek and get a response */
  async chat(messages, options = {}) {
    throw new Error('[aiService] Not implemented — Step 2')
  },

  /** Stream a response from DeepSeek */
  async *streamChat(messages, options = {}) {
    throw new Error('[aiService] Not implemented — Step 2')
  },
}
