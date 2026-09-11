import React, { useState, useEffect } from 'react';
import './UpdateNotification.css';

const api = window.electronAPI;

export default function UpdateNotification() {
  const [status, setStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (!api || !api.updater) return;

    const cleanupChecking = api.updater.onChecking(() => {
      // Unobtrusive, maybe don't show anything until available
    });

    const cleanupAvailable = api.updater.onAvailable((info) => {
      setStatus('available');
      setVersion(info.version);
    });

    const cleanupProgress = api.updater.onProgress((progressObj) => {
      setStatus('downloading');
      setProgress(Math.round(progressObj.percent));
    });

    const cleanupDownloaded = api.updater.onDownloaded((info) => {
      setStatus('downloaded');
      setVersion(info.version);
    });

    const cleanupError = api.updater.onError((err) => {
      console.error('Update error:', err);
      // We don't show error to user directly to avoid annoying them unless they manually requested it
      setStatus('idle'); 
    });

    return () => {
      // In a real app we'd remove listeners, but here we just rely on component unmount
      // Since our preload doesn't currently return cleanup functions for updater, 
      // they just add listeners. It's safe since this mounts once in App.jsx.
    };
  }, []);

  const handleRestart = () => {
    if (api && api.updater) {
      api.updater.install();
    }
  };

  const handleClose = () => {
    setStatus('idle');
  };

  if (status === 'idle' || status === 'checking') return null;

  return (
    <div className="update-notification">
      <div className="update-header">
        <span className="update-icon">🚀</span>
        <strong>Mise à jour {version ? `(${version})` : ''}</strong>
        <button className="update-close-btn" onClick={handleClose}>×</button>
      </div>
      
      <div className="update-body">
        {status === 'available' && (
          <p>Une nouvelle version est disponible et sera téléchargée en arrière-plan...</p>
        )}
        
        {status === 'downloading' && (
          <div className="update-progress-container">
            <p>Téléchargement en cours... {progress}%</p>
            <div className="update-progress-bar">
              <div className="update-progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        )}
        
        {status === 'downloaded' && (
          <div>
            <p>La mise à jour est prête ! Elle s'installera au prochain démarrage.</p>
            <button className="update-restart-btn" onClick={handleRestart}>
              Redémarrer maintenant
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
