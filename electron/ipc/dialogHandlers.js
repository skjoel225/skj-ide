const { ipcMain, dialog } = require('electron')

function registerDialogHandlers(win) {

  // ─── Open Folder dialog ───────────────────────────────────────
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Open Folder',
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // ─── Open File dialog ─────────────────────────────────────────
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'Open File',
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })

  // ─── Save File dialog ─────────────────────────────────────────
  ipcMain.handle('dialog:saveFile', async (_, defaultPath) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Save File As',
      defaultPath: defaultPath || 'untitled.txt',
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'JavaScript', extensions: ['js', 'jsx', 'mjs'] },
        { name: 'TypeScript', extensions: ['ts', 'tsx'] },
        { name: 'Web Files', extensions: ['html', 'css', 'json'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Python', extensions: ['py'] },
        { name: 'Text', extensions: ['txt'] },
      ],
    })
    if (result.canceled) return null
    return result.filePath
  })
}

module.exports = { registerDialogHandlers }
