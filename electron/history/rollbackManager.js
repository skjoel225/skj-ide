const fs = require('fs/promises');
const path = require('path');

class RollbackManager {
  /**
   * Restores files from a specific checkpoint.
   * @param {string} projectRoot 
   * @param {string} checkpointId 
   */
  async rollbackToCheckpoint(projectRoot, checkpointId) {
    const cpDir = path.join(projectRoot, '.skj', 'checkpoints', checkpointId);
    
    try {
      const metadataContent = await fs.readFile(path.join(cpDir, 'metadata.json'), 'utf-8');
      const metadata = JSON.parse(metadataContent);

      for (const fileObj of metadata.files) {
        const backupPath = path.join(cpDir, fileObj.backup);
        const targetPath = path.join(projectRoot, fileObj.original);
        
        await fs.copyFile(backupPath, targetPath);
      }
      return { success: true, message: `Rolled back to checkpoint ${checkpointId}` };
    } catch (err) {
      console.error('Rollback failed:', err);
      return { success: false, error: err.message };
    }
  }

  async listCheckpoints(projectRoot) {
    const checkpointsDir = path.join(projectRoot, '.skj', 'checkpoints');
    try {
      const dirs = await fs.readdir(checkpointsDir);
      const cps = [];
      for (const d of dirs) {
        const mPath = path.join(checkpointsDir, d, 'metadata.json');
        try {
          const mContent = await fs.readFile(mPath, 'utf-8');
          cps.push(JSON.parse(mContent));
        } catch(e) {}
      }
      return cps.sort((a,b) => b.id - a.id); // newest first
    } catch (e) {
      return [];
    }
  }
}

module.exports = new RollbackManager();
