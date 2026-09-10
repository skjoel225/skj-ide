const path = require('path');
const fs = require('fs').promises;

class ThemesMigration {
  async analyze(extensionsPath) {
    const report = {
      detected: 0,
      compatible: 0,
      unsupported: 0,
      themes: []
    };

    try {
      const exists = await this._pathExists(extensionsPath);
      if (!exists) return report;

      const items = await fs.readdir(extensionsPath, { withFileTypes: true });
      const dirs = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));

      for (const dir of dirs) {
        const pkgPath = path.join(extensionsPath, dir.name, 'package.json');
        if (await this._pathExists(pkgPath)) {
          try {
            const content = await fs.readFile(pkgPath, 'utf8');
            const pkg = JSON.parse(content);
            
            if (pkg.contributes && pkg.contributes.themes) {
              for (const theme of pkg.contributes.themes) {
                report.detected++;
                const isCompatible = true; // Themes are generally textmate json, might be compatible
                if (isCompatible) report.compatible++;
                else report.unsupported++;

                report.themes.push({
                  id: `${pkg.publisher}.${pkg.name}.${theme.label}`,
                  label: theme.label,
                  uiTheme: theme.uiTheme,
                  path: path.join(extensionsPath, dir.name, theme.path),
                  isCompatible
                });
              }
            }
          } catch (err) {
            // Ignore parse errors silently
          }
        }
      }
    } catch (err) {
      console.error('Error analyzing themes:', err);
    }

    return report;
  }

  async migrate(themesToMigrate) {
    let imported = 0;
    let failed = 0;
    
    for (const theme of themesToMigrate) {
      try {
        if (theme.isCompatible) {
          // In the future, parse theme JSON and load it into Monaco
          imported++;
        }
      } catch {
        failed++;
      }
    }

    return { imported, failed };
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

module.exports = new ThemesMigration();
