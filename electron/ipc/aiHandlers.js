const { ipcMain } = require('electron');
const deepseekService = require('../services/deepseekService');
const agentService = require('../services/agentService');
const orchestrator = require('../orchestration/orchestrator');
const rollbackManager = require('../history/rollbackManager');
const migrationManager = require('../migration/migrationManager');

function registerAIHandlers(mainWindow) {
  ipcMain.handle('ai:sendMessage', async (event, messages) => {
    try {
      const response = await deepseekService.sendMessage(messages);
      return { success: true, data: response };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ai:testConnection', async () => {
    try {
      await deepseekService.testConnection();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ai:runAgent', async (event, messages, workspace, sessionId) => {
    return await agentService.runAgentLoop(messages, workspace, sessionId);
  });

  ipcMain.handle('ai:rollback', async (event, checkpointId, workspace) => {
    return await rollbackManager.rollback(checkpointId, workspace);
  });

  // Migration Handlers
  ipcMain.handle('migration:detect', async () => {
    return await migrationManager.detectVSCode();
  });

  ipcMain.handle('migration:analyze', async (event, installationId) => {
    return await migrationManager.analyzeVSCode(installationId);
  });

  ipcMain.handle('migration:execute', async (event, analysis, workspace) => {
    return await migrationManager.executeMigration(analysis, workspace);
  });

  ipcMain.handle('migration:history', async () => {
    return migrationManager.getMigrationHistory();
  });

  // New Orchestrator Events
  ipcMain.handle('ai:startTask', async (event, taskDescription, workspacePath) => {
    orchestrator.startTask(taskDescription, workspacePath);
    return { success: true };
  });

  ipcMain.handle('ai:stopTask', async () => {
    orchestrator.stopAll();
    return { success: true };
  });

  // Listen to orchestrator status
  orchestrator.on('status', (statusData) => {
    if (mainWindow) {
      mainWindow.webContents.send('ai:orchestrator-status', statusData);
    }
  });
}

module.exports = { registerAIHandlers };
