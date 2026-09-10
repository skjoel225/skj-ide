const path = require('path');
const fs = require('fs').promises;

class ExtensionsMigration {
  async analyze(extensionsPath) {
    const report = {
      detected: 0,
      compatible: 0,
      unknown: 0,
      incompatible: 0,
      extensions: []
    };

    try {
      const exists = await this._pathExists(extensionsPath);
      if (!exists) return report;

      const items = await fs.readdir(extensionsPath, { withFileTypes: true });
      const dirs = items.filter(item => item.isDirectory() && !item.name.startsWith('.'));

      for (const dir of dirs) {
        const pkgPath = path.join(extensionsPath, dir.name, 'package.json');
        if (await this._pathExists(pkgPath)) {
          report.detected++;
          try {
            const content = await fs.readFile(pkgPath, 'utf8');
            const pkg = JSON.parse(content);
            
            const extInfo = {
              id: `${pkg.publisher}.${pkg.name}`.toLowerCase(),
              publisher: pkg.publisher || 'unknown',
              name: pkg.name || dir.name,
              displayName: pkg.displayName || pkg.name,
              version: pkg.version || '0.0.0',
              description: pkg.description || '',
              compatibility: this._determineCompatibility(pkg)
            };

            report.extensions.push(extInfo);
            report[extInfo.compatibility]++;
          } catch (err) {
            console.error(`Failed to read extension pkg: ${dir.name}`, err);
          }
        }
      }
    } catch (err) {
      console.error('Error analyzing extensions:', err);
    }

    return report;
  }

  _determineCompatibility(pkg) {
    // Basic logic for now: themes and snippets might be compatible.
    // Complex language servers might be unknown.
    if (pkg.contributes && (pkg.contributes.themes || pkg.contributes.snippets)) {
      return 'compatible';
    }
    return 'unknown';
  }

  async _pathExists(p) {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  async migrate(extensionsToMigrate) {
    // In this basic version, we just return true. We'd need an ExtensionManager 
    // to actually download/install or copy them in the future.
    let imported = 0;
    let failed = 0;
    
    for (const ext of extensionsToMigrate) {
      try {
        // Simulate import for now, or just mark it as installed in our registry
        imported++;
      } catch {
        failed++;
      }
    }

    return { imported, failed };
  }
}

module.exports = new ExtensionsMigration();
