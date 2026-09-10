const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class CheckpointManager {
  constructor() {
    this.checkpointsDir = null;
  }

  async init(projectRoot) {
    this.checkpointsDir = path.join(projectRoot, '.skj', 'checkpoints');
    try {
      await fs.mkdir(this.checkpointsDir, { recursive: true });
    } catch (e) {
      // Ignore if already exists
    }
  }

  /**
   * Creates a backup of specific files.
   * @param {string} projectRoot 
   * @param {string} description 
   * @param {Array<string>} filesToBackup Array of absolute or relative paths
   */
  async createCheckpoint(projectRoot, description, filesToBackup) {
    if (!this.checkpointsDir) await this.init(projectRoot);

    const checkpointId = Date.now().toString();
    const cpDir = path.join(this.checkpointsDir, checkpointId);
    await fs.mkdir(cpDir, { recursive: true });

    const metadata = {
      id: checkpointId,
      description,
      timestamp: new Date().toISOString(),
      files: []
    };

    for (const file of filesToBackup) {
      try {
        const absolutePath = path.isAbsolute(file) ? file : path.join(projectRoot, file);
        const relativePath = path.relative(projectRoot, absolutePath);
        
        // Only backup if file exists
        const stat = await fs.stat(absolutePath).catch(() => null);
        if (stat && stat.isFile()) {
          const hashName = crypto.createHash('md5').update(relativePath).digest('hex');
          const backupPath = path.join(cpDir, hashName);
          
          await fs.copyFile(absolutePath, backupPath);
          
          metadata.files.push({
            original: relativePath,
            backup: hashName
          });
        }
      } catch (err) {
        console.error(`Failed to backup file ${file}:`, err);
      }
    }

    await fs.writeFile(path.join(cpDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
    return checkpointId;
  }
}

module.exports = new CheckpointManager();
