const { ipcMain } = require('electron');
const { randomUUID } = require('crypto');
const riskManager = require('../security/riskManager');

class PermissionService {
  constructor() {
    this.mainWindow = null;
    this.pendingRequests = new Map();
  }

  setMainWindow(win) {
    this.mainWindow = win;

    ipcMain.on('agent:permission-response', (event, { id, allowed }) => {
      const resolver = this.pendingRequests.get(id);
      if (resolver) {
        resolver(allowed);
        this.pendingRequests.delete(id);
      }
    });
  }

  async checkPermission(toolName, args) {
    // Read operations are auto-allowed
    if (['read_file', 'list_files', 'search_code', 'search_web'].includes(toolName)) {
      return true;
    }

    // Write operations and commands require confirmation
    if (['write_file', 'edit_file', 'run_command', 'create_directory'].includes(toolName)) {
      return await this.requestUserConfirmation(toolName, args);
    }

    return false;
  }

  requestUserConfirmation(toolName, args) {
    return new Promise((resolve) => {
      const requestId = randomUUID();
      const riskLevel = riskManager.assessRisk(toolName, args);

      // We could add an "Auto" mode here later that auto-resolves if riskLevel is low/medium.
      // For now, if risk is high/critical, or we just want manual mode, we ask:
      
      this.pendingRequests.set(requestId, resolve);

      const mainWindow = this.mainWindow;
      if (mainWindow) {
        mainWindow.webContents.send('ai:request-permission', {
          id: requestId,
          toolName,
          args,
          riskLevel
        });
      } else {
        // If no window, deny by default
        resolve(false);
      }
    });
  }
}

module.exports = new PermissionService();
