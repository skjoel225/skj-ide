const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');
const extract = require('extract-zip');

class ExtensionManager {
  constructor() {
    // Determine the global extensions directory inside user data
    this.extensionsDir = path.join(app.getPath('userData'), 'extensions');
    this.ensureExtensionsDirectory();
  }

  ensureExtensionsDirectory() {
    if (!fs.existsSync(this.extensionsDir)) {
      fs.mkdirSync(this.extensionsDir, { recursive: true });
    }
  }

  getInstalledExtensions() {
    this.ensureExtensionsDirectory();
    const extensions = [];

    const entries = fs.readdirSync(this.extensionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const extPath = path.join(this.extensionsDir, entry.name);
        const manifestPath = path.join(extPath, 'package.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            
            let iconDataUri = null;
            if (manifest.icon) {
              const iconPath = path.join(extPath, manifest.icon);
              if (fs.existsSync(iconPath)) {
                try {
                  const iconBuffer = fs.readFileSync(iconPath);
                  const ext = path.extname(iconPath).toLowerCase();
                  const mimeType = ext === '.svg' ? 'image/svg+xml' :
                                   ext === '.png' ? 'image/png' :
                                   ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
                  iconDataUri = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
                } catch (e) {
                  console.warn(`Could not read icon at ${iconPath}`, e);
                }
              }
            }
            
            extensions.push({
              id: manifest.name || entry.name,
              name: manifest.displayName || manifest.name || entry.name,
              publisher: manifest.publisher || 'Unknown',
              version: manifest.version || '0.0.0',
              description: manifest.description || '',
              icon: iconDataUri,
              installed: true,
              enabled: this._isExtensionEnabled(manifest.name || entry.name),
              compatibility: 'unknown', // Stub for now (Phase 6)
              path: extPath
            });
          } catch (err) {
            console.error(`Failed to parse extension manifest at ${manifestPath}:`, err);
            // Push an errored state extension
            extensions.push({
              id: entry.name,
              name: entry.name,
              publisher: 'Error',
              version: 'Error',
              description: 'Failed to read extension manifest',
              installed: true,
              enabled: false,
              compatibility: 'incompatible',
              path: extPath
            });
          }
        }
      }
    }

    return extensions;
  }

  async installVSIX(vsixPath) {
    this.ensureExtensionsDirectory();
    
    // Create a temporary directory for extraction
    const tempDir = path.join(os.tmpdir(), `skj-ext-install-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // 1. Extract the .vsix (which is just a zip file)
      await extract(vsixPath, { dir: tempDir });

      // 2. A valid VSIX should contain an `extension/` folder
      const extensionSourceDir = path.join(tempDir, 'extension');
      if (!fs.existsSync(extensionSourceDir)) {
        throw new Error("Invalid VSIX format: missing 'extension' folder.");
      }

      // 3. Read package.json
      const manifestPath = path.join(extensionSourceDir, 'package.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error("Invalid VSIX format: missing package.json inside 'extension' folder.");
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      if (!manifest.name || !manifest.publisher) {
        throw new Error("Invalid extension manifest: missing 'name' or 'publisher'.");
      }

      // 4. Determine destination folder: <publisher>.<name>-<version>
      const folderName = `${manifest.publisher}.${manifest.name}-${manifest.version || '0.0.0'}`;
      const destDir = path.join(this.extensionsDir, folderName);

      // Check if already installed
      if (fs.existsSync(destDir)) {
        // Simple uninstall (remove old dir) before installing new
        fs.rmSync(destDir, { recursive: true, force: true });
      }

      // 5. Move from temp to final destination
      // Using fs.renameSync can fail across different partitions, 
      // but fs.cpSync is safer.
      fs.cpSync(extensionSourceDir, destDir, { recursive: true });

      let iconDataUri = null;
      if (manifest.icon) {
        const iconPath = path.join(destDir, manifest.icon);
        if (fs.existsSync(iconPath)) {
          try {
            const iconBuffer = fs.readFileSync(iconPath);
            const ext = path.extname(iconPath).toLowerCase();
            const mimeType = ext === '.svg' ? 'image/svg+xml' :
                             ext === '.png' ? 'image/png' :
                             ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
            iconDataUri = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
          } catch (e) {
            console.warn(`Could not read icon at ${iconPath}`, e);
          }
        }
      }

      // 6. Return the new extension info
      return {
        id: manifest.name,
        name: manifest.displayName || manifest.name,
        publisher: manifest.publisher,
        version: manifest.version || '0.0.0',
        description: manifest.description || '',
        icon: iconDataUri,
        installed: true,
        enabled: this._isExtensionEnabled(manifest.name),
        compatibility: 'unknown',
        path: destDir
      };
    } catch (err) {
      console.error('VSIX installation failed:', err);
      throw err;
    } finally {
      // 7. Cleanup temp dir
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
          console.warn(`Failed to cleanup temp dir: ${tempDir}`, e);
        }
      }
    }
  }

  // --- Phase 3: Extension Management ---
  
  _getDisabledList() {
    const registryPath = path.join(this.extensionsDir, 'disabled_extensions.json');
    if (!fs.existsSync(registryPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  _saveDisabledList(list) {
    const registryPath = path.join(this.extensionsDir, 'disabled_extensions.json');
    fs.writeFileSync(registryPath, JSON.stringify(list, null, 2));
  }

  _isExtensionEnabled(id) {
    return !this._getDisabledList().includes(id);
  }

  async uninstall(id) {
    const extensions = await this.getInstalledExtensions();
    const ext = extensions.find(e => e.id === id);
    if (!ext) throw new Error(`Extension ${id} is not installed`);
    
    // Remove directory
    if (fs.existsSync(ext.path)) {
      fs.rmSync(ext.path, { recursive: true, force: true });
    }
    
    // Remove from cache
    this.cache = null;

    // Remove from disabled list if present
    const disabledList = this._getDisabledList();
    if (disabledList.includes(id)) {
      this._saveDisabledList(disabledList.filter(eId => eId !== id));
    }
    return true;
  }

  async enable(id) {
    const disabledList = this._getDisabledList();
    if (disabledList.includes(id)) {
      this._saveDisabledList(disabledList.filter(eId => eId !== id));
      this.cache = null; // force reload
    }
    return true;
  }

  async disable(id) {
    const disabledList = this._getDisabledList();
    if (!disabledList.includes(id)) {
      disabledList.push(id);
      this._saveDisabledList(disabledList);
      this.cache = null; // force reload
    }
    return true;
  }

  async getReadme(id) {
    const extensions = await this.getInstalledExtensions();
    const ext = extensions.find(e => e.id === id);
    if (!ext) throw new Error(`Extension ${id} is not installed`);
    
    const possibleReadmes = ['README.md', 'readme.md', 'Readme.md'];
    for (const file of possibleReadmes) {
      const readmePath = path.join(ext.path, file);
      if (fs.existsSync(readmePath)) {
        return fs.readFileSync(readmePath, 'utf-8');
      }
    }
    return 'No README found for this extension.';
  }
}

// Export as a singleton
const extensionManager = new ExtensionManager();
module.exports = extensionManager;
