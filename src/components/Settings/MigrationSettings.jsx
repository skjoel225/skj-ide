import React, { useState, useEffect } from 'react';
import '../Migration/MigrationModal.css'; // Reuse CSS for buttons if needed

export default function MigrationSettings({ projectRoot }) {
  const [history, setHistory] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const hist = await window.electronAPI.migration.history();
      setHistory(hist);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualImport = async () => {
    setShowModal(true);
    // Modal will handle detection and import logic. We could also just reset the skipped flag and reload
    localStorage.removeItem('migration.vscode.initialPromptShown');
  };

  const handleRollback = async (checkpointId) => {
    if (!checkpointId) return;
    try {
      await window.electronAPI.ai.rollback(checkpointId, projectRoot);
      alert('Rollback réussi.');
    } catch (err) {
      alert('Erreur lors du rollback : ' + err.message);
    }
  };

  return (
    <div className="migration-settings" style={{ padding: '20px', color: '#e0e0e0' }}>
      <h2>Paramètres de Migration</h2>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>Visual Studio Code</h3>
        <p>Importez votre environnement VS Code (extensions, paramètres, raccourcis, snippets, thèmes) directement dans SKJ IDE.</p>
        <button 
          className="btn-primary" 
          onClick={handleManualImport}
          style={{ marginTop: '10px' }}
        >
          Lancer l'assistant d'importation
        </button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
        <h3>Historique des migrations</h3>
        {history.length === 0 ? (
          <p style={{ color: '#aaa' }}>Aucune migration n'a été effectuée.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {history.map((h, i) => (
              <li key={i} style={{ padding: '15px', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>Date :</strong> {new Date(h.timestamp).toLocaleString()} <br/>
                    <strong>Source :</strong> {h.source}
                  </div>
                  <div>
                    {h.checkpointId && (
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleRollback(h.checkpointId)}
                      >
                        Rollback
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '13px', color: '#aaa' }}>
                  {h.summary.extensions.imported} extensions, {h.summary.settings.imported} paramètres, {h.summary.keybindings.imported} raccourcis, {h.summary.snippets.imported} snippets, {h.summary.themes.imported} thèmes importés.
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <div style={{position: 'fixed', top:0, left:0, zIndex:10000}}>
           {/* In App.jsx we'll conditionally mount MigrationModal, or we can just reload and let App.jsx handle it */}
        </div>
      )}
    </div>
  );
}
