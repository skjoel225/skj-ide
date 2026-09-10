const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class GitService {
  /**
   * Checks if a directory is a git repository.
   * @param {string} projectRoot 
   */
  async isGitRepo(projectRoot) {
    try {
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: projectRoot });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Gets the current git status.
   * @param {string} projectRoot 
   */
  async getStatus(projectRoot) {
    try {
      const { stdout } = await execAsync('git status -s', { cwd: projectRoot });
      const lines = stdout.split('\n').filter(l => l.trim() !== '');
      
      const modified = [];
      const added = [];
      const deleted = [];
      const untracked = [];

      lines.forEach(line => {
        const status = line.substring(0, 2);
        const file = line.substring(3).trim();
        
        if (status.includes('M')) modified.push(file);
        else if (status.includes('A')) added.push(file);
        else if (status.includes('D')) deleted.push(file);
        else if (status.includes('??')) untracked.push(file);
      });

      return {
        success: true,
        modified,
        added,
        deleted,
        untracked,
        total: lines.length
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Gets the diff for the workspace or a specific file.
   * @param {string} projectRoot 
   * @param {string} [filePath] 
   */
  async getDiff(projectRoot, filePath = '') {
    try {
      // First, get unstaged diff
      let { stdout } = await execAsync(`git diff HEAD -- "${filePath}"`, { cwd: projectRoot });
      
      // If there's no diff against HEAD, maybe the file is untracked but we can't easily diff that without staging it.
      // So we just return standard diff.
      return { success: true, diff: stdout };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

module.exports = new GitService();
