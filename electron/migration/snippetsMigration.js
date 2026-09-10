const path = require('path');
const fs = require('fs').promises;

class SnippetsMigration {
  async analyze(userPath) {
    const snippetsDir = path.join(userPath, 'snippets');
    const report = {
      detected: 0,
      snippets: []
    };

    try {
      const exists = await this._pathExists(snippetsDir);
      if (!exists) return report;

      const files = await fs.readdir(snippetsDir);
      const snippetFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.code-snippets'));

      report.detected = snippetFiles.length;

      for (const file of snippetFiles) {
        report.snippets.push({
          filename: file,
          path: path.join(snippetsDir, file)
        });
      }

    } catch (err) {
      console.error('Error analyzing snippets:', err);
    }

    return report;
  }

  async migrate(snippetsToMigrate) {
    let imported = 0;
    let failed = 0;
    const skjSnippets = []; // Could be paths to newly copied files

    for (const snippet of snippetsToMigrate) {
      try {
        // Here we would copy snippet files to SKJ IDE snippet dir
        // For now, we simulate success
        skjSnippets.push(snippet.filename);
        imported++;
      } catch {
        failed++;
      }
    }

    return { imported, failed, data: skjSnippets };
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

module.exports = new SnippetsMigration();
