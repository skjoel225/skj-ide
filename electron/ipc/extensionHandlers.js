const { ipcMain } = require('electron');
const extensionManager = require('../extensions/extensionManager');
const marketplaceService = require('../extensions/marketplaceService');

function registerExtensionHandlers() {
  ipcMain.handle('extensions:getInstalled', async () => {
    try {
      return extensionManager.getInstalledExtensions();
    } catch (err) {
      throw new Error(`Failed to get installed extensions: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:installVSIX', async (_, filePath) => {
    try {
      return await extensionManager.installVSIX(filePath);
    } catch (err) {
      throw new Error(`Installation failed: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:search', async (_, query) => {
    try {
      return await marketplaceService.search(query);
    } catch (err) {
      throw new Error(`Marketplace search failed: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:installFromMarketplace', async (_, downloadUrl) => {
    try {
      return await marketplaceService.installFromMarketplace(downloadUrl);
    } catch (err) {
      throw new Error(`Marketplace installation failed: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:uninstall', async (_, id) => {
    try {
      return await extensionManager.uninstall(id);
    } catch (err) {
      throw new Error(`Uninstallation failed: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:enable', async (_, id) => {
    try {
      return await extensionManager.enable(id);
    } catch (err) {
      throw new Error(`Enable failed: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:disable', async (_, id) => {
    try {
      return await extensionManager.disable(id);
    } catch (err) {
      throw new Error(`Disable failed: ${err.message}`);
    }
  });

  ipcMain.handle('extensions:getLocalReadme', async (_, id) => {
    return await extensionManager.getReadme(id);
  });

  ipcMain.handle('extensions:getMarketplaceReadme', async (_, url) => {
    return await marketplaceService.getReadme(url);
  });
}

module.exports = { registerExtensionHandlers };
