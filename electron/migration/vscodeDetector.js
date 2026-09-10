const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class VSCodeDetector {
  constructor() {
    this.appData = process.env.APPDATA;
    this.userProfile = process.env.USERPROFILE;
  }

  async detect() {
    const installations = [];

    // Check Stable
    const stableUserPath = path.join(this.appData, 'Code', 'User');
    const stableExtPath = path.join(this.userProfile, '.vscode', 'extensions');
    const hasStableUser = await this._pathExists(stableUserPath);
    const hasStableExt = await this._pathExists(stableExtPath);

    if (hasStableUser || hasStableExt) {
      installations.push({
        id: 'vscode-stable',
        type: 'vscode',
        edition: 'stable',
        name: 'Visual Studio Code',
        userPath: stableUserPath,
        extensionsPath: stableExtPath,
        available: true
      });
    }

    // Check Insiders
    const insidersUserPath = path.join(this.appData, 'Code - Insiders', 'User');
    const insidersExtPath = path.join(this.userProfile, '.vscode-insiders', 'extensions');
    const hasInsidersUser = await this._pathExists(insidersUserPath);
    const hasInsidersExt = await this._pathExists(insidersExtPath);

    if (hasInsidersUser || hasInsidersExt) {
      installations.push({
        id: 'vscode-insiders',
        type: 'vscode',
        edition: 'insiders',
        name: 'Visual Studio Code Insiders',
        userPath: insidersUserPath,
        extensionsPath: insidersExtPath,
        available: true
      });
    }

    return installations;
  }

  async _pathExists(p) {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = new VSCodeDetector();
