const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

class UpdateManager {
  constructor() {
    this.mainWindow = null;

    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Events
    autoUpdater.on('checking-for-update', () => {
      this.notify('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
      this.notify('update:available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.notify('update:not-available', info);
    });

    autoUpdater.on('error', (err) => {
      this.notify('update:error', err.message);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.notify('update:progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.notify('update:downloaded', info);
    });

    // IPC Handlers
    ipcMain.handle('update:check', () => {
      return autoUpdater.checkForUpdates();
    });

    ipcMain.handle('update:download', () => {
      return autoUpdater.downloadUpdate();
    });

    ipcMain.handle('update:install', () => {
      autoUpdater.quitAndInstall(false, true);
    });
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  notify(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

module.exports = new UpdateManager();
