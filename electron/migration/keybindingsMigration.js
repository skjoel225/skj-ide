const path = require('path');
const fs = require('fs').promises;

class KeybindingsMigration {
  async analyze(userPath) {
    const kbPath = path.join(userPath, 'keybindings.json');
    const report = {
      detected: 0,
      compatible: 0,
      unsupported: 0,
      keybindings: []
    };

    try {
      const exists = await this._pathExists(kbPath);
      if (!exists) return report;

      const content = await fs.readFile(kbPath, 'utf8');
      const cleanContent = this._stripJsonComments(content);
      const keybindings = JSON.parse(cleanContent);

      report.detected = keybindings.length;

      for (const kb of keybindings) {
        const isCompatible = this._isCompatible(kb.command);
        if (isCompatible) {
          report.compatible++;
        } else {
          report.unsupported++;
        }
        report.keybindings.push({ ...kb, isCompatible });
      }

    } catch (err) {
      console.error('Error analyzing keybindings:', err);
    }

    return report;
  }

  async migrate(keybindingsToMigrate) {
    let imported = 0;
    let failed = 0;
    const skjKeybindings = [];

    for (const kb of keybindingsToMigrate) {
      try {
        if (kb.isCompatible) {
          skjKeybindings.push(kb);
          imported++;
        }
      } catch {
        failed++;
      }
    }

    return { imported, failed, data: skjKeybindings };
  }

  _isCompatible(command) {
    // Basic whitelist of commands we might support
    const supportedPrefixes = ['editor.action.', 'workbench.action.'];
    return supportedPrefixes.some(p => command.startsWith(p));
  }

  _stripJsonComments(jsonStr) {
    return jsonStr.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
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

module.exports = new KeybindingsMigration();
