import React, { useState, useEffect, useRef } from 'react';
import './ExtensionsPane.css';

const api = window.electronAPI;

export default function ExtensionsPane({ onOpenExtension }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [installedExtensions, setInstalledExtensions] = useState([]);
  const [marketplaceResults, setMarketplaceResults] = useState([]);
  const [isLoadingInstalled, setIsLoadingInstalled] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState(null);

  // Use a ref to track the latest request ID (acts like AbortController for IPC)
  const latestRequestId = useRef(0);
  const debounceTimer = useRef(null);

  // Initial fetch of installed extensions
  const fetchInstalledExtensions = async () => {
    setIsLoadingInstalled(true);
    try {
      const ext = await api.extensions.getInstalled();
      setInstalledExtensions(ext || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingInstalled(false);
    }
  };

  useEffect(() => {
    fetchInstalledExtensions();
  }, []);

  // Handle Debounced Marketplace Search
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const query = searchQuery.trim();

    // Revert to initial state if empty
    if (!query) {
      setMarketplaceResults([]);
      setIsSearching(false);
      setError(null);
      // Increment request ID to ignore any pending requests
      latestRequestId.current += 1;
      return;
    }

    // Debounce 400ms
    debounceTimer.current = setTimeout(async () => {
      const requestId = ++latestRequestId.current;
      setIsSearching(true);
      setError(null);

      try {
        const results = await api.extensions.search(query);
        // Only update if this is still the latest request
        if (requestId === latestRequestId.current) {
          setMarketplaceResults(results || []);
          setIsSearching(false);
        }
      } catch (err) {
        if (requestId === latestRequestId.current) {
          setError(err.message || 'Unable to connect to Extensions Marketplace.');
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleInstallVSIX = async () => {
    try {
      const filePaths = await api.dialog.openFile();
      if (filePaths && filePaths.length > 0) {
        const vsixPath = filePaths[0];
        if (!vsixPath.endsWith('.vsix') && !vsixPath.endsWith('.zip')) {
          setError('Please select a valid .vsix file.');
          return;
        }

        setIsInstalling(true);
        setError(null);
        await api.extensions.installVSIX(vsixPath);
        await fetchInstalledExtensions();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleInstallFromMarketplace = async (ext) => {
    if (!ext.downloadUrl) return;
    try {
      setIsInstalling(true);
      setError(null);
      await api.extensions.installFromMarketplace(ext.downloadUrl);
      await fetchInstalledExtensions();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsInstalling(false);
    }
  };

  const renderExtensionCard = (ext, isMarketplace) => {
    const isAlreadyInstalled = installedExtensions.some(ie => ie.id === ext.id);
    const downloads = ext.downloadCount ? (ext.downloadCount > 1000000 ? (ext.downloadCount/1000000).toFixed(1) + 'M' : (ext.downloadCount/1000).toFixed(1) + 'K') : '0';
    const rating = ext.rating ? ext.rating.toFixed(1) : 'N/A';

    return (
      <div 
        key={ext.id} 
        className="extension-card" 
        onClick={() => onOpenExtension && onOpenExtension(ext, isMarketplace)}
      >
        <div className="extension-icon">
          {ext.icon ? (
            <img src={ext.icon} alt="icon" onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="extension-icon-placeholder">🧩</div>
          )}
        </div>
        <div className="extension-details">
          <div className="extension-name" title={ext.name}>{ext.name}</div>
          <div className="extension-description" title={ext.description}>{ext.description}</div>
          <div className="extension-meta">
            <span className="extension-publisher">{ext.publisher}</span>
            {isMarketplace && (
              <>
                <span className="extension-downloads">↓ {downloads}</span>
                <span className="extension-rating">★ {rating}</span>
              </>
            )}
            {!isMarketplace && ext.version && <span className="extension-version">v{ext.version}</span>}
          </div>
        </div>
        {isMarketplace && !isAlreadyInstalled && (
          <button 
            className="extension-install-btn" 
            onClick={(e) => { e.stopPropagation(); handleInstallFromMarketplace(ext); }}
            disabled={isInstalling}
          >
            Install
          </button>
        )}
        {isMarketplace && isAlreadyInstalled && (
          <button className="extension-install-btn extension-installed-btn" disabled>
            Installed
          </button>
        )}
      </div>
    );
  };

  const isMarketplaceView = searchQuery.trim().length > 0;

  return (
    <div className="extensions-pane">
      <div className="extensions-pane-header">
        <span>EXTENSIONS</span>
        <div className="extensions-header-actions">
          <button 
            className="extension-icon-btn" 
            onClick={handleInstallVSIX} 
            title="Install from VSIX..."
            disabled={isInstalling}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="extensions-pane-body">
        <div className="extensions-search">
          <input 
            type="text" 
            placeholder="Search Extensions in Marketplace" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="extensions-list-container">
          {error && (
            <div className="extensions-error">
              {error}
              {isMarketplaceView && (
                <button className="extensions-retry-btn" onClick={() => setSearchQuery(searchQuery + ' ')}>Retry</button>
              )}
            </div>
          )}

          {isInstalling && (
            <div className="extensions-status">Installing...</div>
          )}

          {!isMarketplaceView ? (
            // --- INSTALLED VIEW ---
            <>
              <div className="extensions-section-title">
                INSTALLED ({installedExtensions.length})
              </div>
              {isLoadingInstalled ? (
                <div className="extensions-status">Loading...</div>
              ) : installedExtensions.length === 0 ? (
                <div className="extensions-empty">No extensions found.</div>
              ) : (
                <div className="extensions-list">
                  {installedExtensions.map(ext => renderExtensionCard(ext, false))}
                </div>
              )}
            </>
          ) : (
            // --- MARKETPLACE VIEW ---
            <>
              <div className="extensions-section-title">
                MARKETPLACE
              </div>
              {isSearching ? (
                <div className="extensions-status">Searching...</div>
              ) : marketplaceResults.length === 0 && !error ? (
                <div className="extensions-empty">No extensions found for "{searchQuery}".</div>
              ) : (
                <div className="extensions-list">
                  {marketplaceResults.map(ext => renderExtensionCard(ext, true))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
