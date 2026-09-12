const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const extensionManager = require('./extensionManager');

class MarketplaceService {
  constructor() {
    this.baseUrl = 'https://open-vsx.org/api';
    this.cache = new Map();
    this.CACHE_TTL = 1000 * 60 * 5; // 5 minutes
  }

  async search(query) {
    if (!query || query.trim() === '') return [];
    
    const normalizedQuery = query.trim();
    const cacheKey = `search:${normalizedQuery}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Fetch from Open VSX
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}/-/search?query=${encodeURIComponent(normalizedQuery)}&size=20`;
      
      https.get(url, {
        headers: { 'User-Agent': 'SKJ-IDE/1.2.2' }
      }, (res) => {
        let data = '';

        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Marketplace API returned status ${res.statusCode}`));
        }

        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            // Format results
            const results = (parsed.extensions || []).map(ext => ({
              id: `${ext.namespace}.${ext.name}`,
              name: ext.displayName || ext.name,
              publisher: ext.namespace,
              version: ext.version,
              description: ext.description,
              icon: ext.files.icon || null,
              downloadCount: ext.downloadCount || 0,
              rating: ext.averageRating || 0,
              downloadUrl: ext.files.download,
              readmeUrl: ext.files.readme
            }));

            // Save to cache
            this.cache.set(cacheKey, { timestamp: Date.now(), data: results });
            resolve(results);
          } catch (e) {
            reject(new Error('Failed to parse Marketplace response'));
          }
        });
      }).on('error', (err) => {
        reject(new Error(`Network error: ${err.message}`));
      });
    });
  }

  async installFromMarketplace(downloadUrl) {
    return new Promise((resolve, reject) => {
      const tempPath = path.join(os.tmpdir(), `skj-ext-download-${Date.now()}.vsix`);
      const file = fs.createWriteStream(tempPath);

      const request = https.get(downloadUrl, {
        headers: { 'User-Agent': 'SKJ-IDE/1.2.2' }
      }, (response) => {
        // Handle redirects (OpenVSX often redirects downloads)
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.unlinkSync(tempPath); // delete empty file
          this.installFromMarketplace(response.headers.location).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download extension: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', async () => {
          file.close();
          try {
            // Re-use Phase 2 logic!
            const installedExt = await extensionManager.installVSIX(tempPath);
            resolve(installedExt);
          } catch (err) {
            reject(err);
          } finally {
            // Cleanup temp file
            if (fs.existsSync(tempPath)) {
              fs.unlinkSync(tempPath);
            }
          }
        });
      });

      request.on('error', (err) => {
        fs.unlink(tempPath, () => {});
        reject(new Error(`Download failed: ${err.message}`));
      });
    });
  }

  async getReadme(readmeUrl) {
    if (!readmeUrl) return 'No README available.';
    return new Promise((resolve, reject) => {
      https.get(readmeUrl, {
        headers: { 'User-Agent': 'SKJ-IDE/1.2.2' }
      }, (res) => {
        let data = '';
        if (res.statusCode === 301 || res.statusCode === 302) {
          return this.getReadme(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`Failed to fetch README: HTTP ${res.statusCode}`));
        }
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', err => reject(err));
    });
  }
}

const marketplaceService = new MarketplaceService();
module.exports = marketplaceService;
