const fs = require('fs').promises;
const path = require('path');
const vscodeDetector = require('./vscodeDetector');
const settingsMigration = require('./settingsMigration');
const keybindingsMigration = require('./keybindingsMigration');
const snippetsMigration = require('./snippetsMigration');
const themesMigration = require('./themesMigration');
const extensionsMigration = require('./extensionsMigration');
const checkpointManager = require('../history/checkpointManager');

class MigrationManager {
  constructor() {
    this.migrationHistory = [];
  }

  async detectVSCode() {
    return await vscodeDetector.detect();
  }

  async analyzeVSCode(installationId) {
    const installations = await vscodeDetector.detect();
    const inst = installations.find(i => i.id === installationId);
    if (!inst) throw new Error(`Installation ${installationId} not found`);

    console.log(`[Migration] Analyzing ${inst.name} at ${inst.userPath}`);

    const [settings, keybindings, snippets, themes, extensions] = await Promise.all([
      settingsMigration.analyze(inst.userPath),
      keybindingsMigration.analyze(inst.userPath),
      snippetsMigration.analyze(inst.userPath),
      themesMigration.analyze(inst.extensionsPath),
      extensionsMigration.analyze(inst.extensionsPath)
    ]);

    return {
      id: `mig-${Date.now()}`,
      source: inst,
      detectedAt: new Date().toISOString(),
      items: {
        settings,
        keybindings,
        snippets,
        themes,
        extensions
      },
      status: 'pending'
    };
  }

  async executeMigration(analysis, workspaceRoot) {
    console.log(`[Migration] Starting import from ${analysis.source.name}`);
    
    // Create checkpoint before migrating if workspaceRoot is provided
    let checkpointId = null;
    if (workspaceRoot) {
      try {
        console.log('[Migration] Creating pre-migration checkpoint...');
        // In a real implementation we might pass all affected files, but here we just checkpoint the project root
        // or a specific settings directory. Since SKJ IDE settings might be in the project or global, 
        // we'll just save the project state to be safe.
        checkpointId = await checkpointManager.createCheckpoint(
          workspaceRoot, 
          'Pre-VSCode Migration', 
          'system'
        );
      } catch (err) {
        console.warn('[Migration] Failed to create checkpoint, continuing anyway:', err);
      }
    }

    // Import items
    const [extRes, setRes, kbRes, snipRes, themeRes] = await Promise.all([
      extensionsMigration.migrate(analysis.items.extensions.extensions),
      settingsMigration.migrate(analysis.items.settings.settings),
      keybindingsMigration.migrate(analysis.items.keybindings.keybindings),
      snippetsMigration.migrate(analysis.items.snippets.snippets),
      themesMigration.migrate(analysis.items.themes.themes)
    ]);

    const result = {
      id: analysis.id,
      timestamp: new Date().toISOString(),
      source: analysis.source.name,
      checkpointId,
      summary: {
        extensions: extRes,
        settings: setRes,
        keybindings: kbRes,
        snippets: snipRes,
        themes: themeRes
      },
      status: 'completed'
    };

    this.migrationHistory.push(result);
    console.log('[Migration] Import completed successfully');

    return result;
  }

  getMigrationHistory() {
    return this.migrationHistory;
  }
}

module.exports = new MigrationManager();
