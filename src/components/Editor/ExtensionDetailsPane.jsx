import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './ExtensionDetailsPane.css';

const api = window.electronAPI;

export default function ExtensionDetailsPane({ extension, onClose }) {
  const [readme, setReadme] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  // State to reflect current actions without re-mounting entirely
  const [isInstalled, setIsInstalled] = useState(!extension.isMarketplace || extension.installed);
  const [isEnabled, setIsEnabled] = useState(extension.enabled !== false);

  useEffect(() => {
    let isMounted = true;
    const fetchReadme = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let content = '';
        if (extension.isMarketplace) {
          content = await api.extensions.getMarketplaceReadme(extension.readmeUrl);
        } else {
          content = await api.extensions.getLocalReadme(extension.id);
        }
        if (isMounted) setReadme(content);
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError("Failed to load README.md");
          setReadme('');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchReadme();
    return () => { isMounted = false; };
  }, [extension.id, extension.isMarketplace, extension.readmeUrl]);

  const handleInstall = async () => {
    setIsProcessing(true);
    try {
      await api.extensions.installFromMarketplace(extension.downloadUrl);
      setIsInstalled(true);
      setIsEnabled(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUninstall = async () => {
    setIsProcessing(true);
    try {
      await api.extensions.uninstall(extension.id);
      setIsInstalled(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEnable = async () => {
    setIsProcessing(true);
    try {
      if (isEnabled) {
        await api.extensions.disable(extension.id);
        setIsEnabled(false);
      } else {
        await api.extensions.enable(extension.id);
        setIsEnabled(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloads = extension.downloadCount ? (extension.downloadCount > 1000000 ? (extension.downloadCount/1000000).toFixed(1) + 'M' : (extension.downloadCount/1000).toFixed(1) + 'K') : '0';
  const rating = extension.rating ? extension.rating.toFixed(1) : 'N/A';

  return (
    <div className="extension-details-pane">
      <div className="extension-details-header">
        <div className="ext-icon-large">
          {extension.icon ? (
            <img src={extension.icon} alt={`${extension.name} icon`} onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="ext-placeholder-large">🧩</div>
          )}
        </div>
        <div className="ext-info-large">
          <div className="ext-title-row">
            <h1 className="ext-name">{extension.name}</h1>
            <span className="ext-version">v{extension.version}</span>
          </div>
          <div className="ext-publisher">{extension.publisher}</div>
          <div className="ext-description">{extension.description}</div>
          
          <div className="ext-stats">
            <span className="ext-stat-badge">↓ {downloads}</span>
            <span className="ext-stat-badge">★ {rating}</span>
          </div>

          <div className="ext-actions">
            {!isInstalled ? (
              <button className="ext-btn ext-btn-primary" onClick={handleInstall} disabled={isProcessing || !extension.downloadUrl}>
                {isProcessing ? 'Installing...' : 'Install'}
              </button>
            ) : (
              <>
                <button className="ext-btn ext-btn-danger" onClick={handleUninstall} disabled={isProcessing}>
                  Uninstall
                </button>
                <button className="ext-btn ext-btn-secondary" onClick={handleToggleEnable} disabled={isProcessing}>
                  {isEnabled ? 'Disable' : 'Enable'}
                </button>
                <div className="ext-auto-update">
                  <input type="checkbox" id={`auto-update-${extension.id}`} defaultChecked />
                  <label htmlFor={`auto-update-${extension.id}`}>Auto-update</label>
                </div>
              </>
            )}
            
            {error && <span className="ext-error-text">{error}</span>}
          </div>
        </div>
      </div>

      <div className="extension-details-body">
        <div className="ext-tabs">
          <div className="ext-tab active">Details</div>
          <div className="ext-tab">Changelog</div>
        </div>
        
        <div className="ext-content">
          {isLoading ? (
            <div className="ext-loading">Loading README...</div>
          ) : (
            <div className="ext-markdown">
              <ReactMarkdown>{readme}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
