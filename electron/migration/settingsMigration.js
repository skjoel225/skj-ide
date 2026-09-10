const path = require('path');
const fs = require('fs').promises;

class SettingsMigration {
  async analyze(userPath) {
    const settingsPath = path.join(userPath, 'settings.json');
    const report = {
      detected: 0,
      compatible: 0,
      unsupported: 0,
      settings: []
    };

    try {
      const exists = await this._pathExists(settingsPath);
      if (!exists) return report;

      // Handle comments in JSON (VS Code allows comments)
      const content = await fs.readFile(settingsPath, 'utf8');
      const cleanContent = this._stripJsonComments(content);
      const settings = JSON.parse(cleanContent);

      const keys = Object.keys(settings);
      report.detected = keys.length;

      for (const key of keys) {
        const isCompatible = this._isCompatible(key);
        if (isCompatible) {
          report.compatible++;
        } else {
          report.unsupported++;
        }
        report.settings.push({ key, value: settings[key], isCompatible });
      }

    } catch (err) {
      console.error('Error analyzing settings:', err);
    }

    return report;
  }

  async migrate(settingsToMigrate) {
    let imported = 0;
    let failed = 0;
    const skjSettings = {}; // We would load existing SKJ settings here

    for (const setting of settingsToMigrate) {
      try {
        if (setting.isCompatible) {
          skjSettings[setting.key] = setting.value;
          imported++;
        }
      } catch {
        failed++;
      }
    }

    // Save to SKJ settings file
    // await fs.writeFile(SKJ_SETTINGS_PATH, JSON.stringify(skjSettings, null, 2));

    return { imported, failed, data: skjSettings };
  }

  _isCompatible(key) {
    // We assume editor.* and terminal.* settings are mostly compatible with Monaco/xterm
    if (key.startsWith('editor.') || key.startsWith('terminal.')) {
      return true;
    }
    return false;
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

module.exports = new SettingsMigration();
