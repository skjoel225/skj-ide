class FileLockManager {
  constructor() {
    this.locks = new Map(); // filePath -> agentId
  }

  /**
   * Attempts to lock a file for a specific agent.
   * @param {string} filePath 
   * @param {string} agentId 
   * @returns {boolean} true if locked successfully, false if already locked by another agent
   */
  lock(filePath, agentId) {
    if (this.locks.has(filePath)) {
      const existingAgent = this.locks.get(filePath);
      if (existingAgent !== agentId) {
        return false;
      }
    }
    this.locks.set(filePath, agentId);
    return true;
  }

  /**
   * Unlocks a file.
   * @param {string} filePath 
   * @param {string} agentId 
   */
  unlock(filePath, agentId) {
    if (this.locks.get(filePath) === agentId) {
      this.locks.delete(filePath);
    }
  }

  /**
   * Clears all locks. Useful when task stops or finishes.
   */
  clearAll() {
    this.locks.clear();
  }
}

module.exports = new FileLockManager();
