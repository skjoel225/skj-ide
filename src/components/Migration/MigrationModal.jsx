import React, { useState, useEffect } from 'react';
import './MigrationModal.css';

export default function MigrationModal({ onClose, projectRoot }) {
  const [step, setStep] = useState('detecting'); // detecting, prompt, analyzing, preview, migrating, report
  const [installations, setInstallations] = useState([]);
  const [selectedInst, setSelectedInst] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    // Check if user already skipped
    const skipped = localStorage.getItem('migration.vscode.initialPromptShown');
    if (skipped) {
      onClose();
      return;
    }

    const detect = async () => {
      try {
        const insts = await window.electronAPI.migration.detect();
        if (insts && insts.length > 0) {
          setInstallations(insts);
          setSelectedInst(insts[0]);
          setStep('prompt');
        } else {
          localStorage.setItem('migration.vscode.initialPromptShown', 'true');
          onClose();
        }
      } catch (err) {
        console.error(err);
        onClose();
      }
    };
    detect();
  }, [onClose]);

  const handleSkip = () => {
    localStorage.setItem('migration.vscode.initialPromptShown', 'true');
    onClose();
  };

  const handleAnalyze = async () => {
    setStep('analyzing');
    try {
      const result = await window.electronAPI.migration.analyze(selectedInst.id);
      setAnalysis(result);
      setStep('preview');
    } catch (err) {
      console.error(err);
      setStep('prompt');
    }
  };

  const handleMigrate = async () => {
    setStep('migrating');
    try {
      const res = await window.electronAPI.migration.execute(analysis, projectRoot);
      setReport(res);
      setStep('report');
      localStorage.setItem('migration.vscode.initialPromptShown', 'true');
    } catch (err) {
      console.error(err);
      setStep('preview');
    }
  };

  if (step === 'detecting') return null;

  return (
    <div className="migration-modal-overlay">
      <div className="migration-modal">
        {step === 'prompt' && (
          <div className="migration-content">
            <h2>Bienvenue dans SKJ IDE 👋</h2>
            <p>Nous avons détecté Visual Studio Code sur votre ordinateur.</p>
            <p>Voulez-vous importer votre environnement ?</p>
            <ul className="migration-list">
              <li>✓ Extensions</li>
              <li>✓ Paramètres</li>
              <li>✓ Raccourcis clavier</li>
              <li>✓ Snippets</li>
              <li>✓ Thèmes</li>
            </ul>
            <div className="migration-actions">
              <button className="btn-secondary" onClick={handleSkip}>Ignorer</button>
              <button className="btn-primary" onClick={handleAnalyze}>Importer</button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="migration-content">
            <h2>Analyse en cours...</h2>
            <p>Recherche des paramètres et extensions...</p>
          </div>
        )}

        {step === 'preview' && analysis && (
          <div className="migration-content">
            <h2>Migration VS Code</h2>
            <div className="migration-preview">
              <div className="preview-section">
                <h3>Extensions</h3>
                <p>✓ {analysis.items.extensions.compatible} compatibles</p>
                <p>⚠ {analysis.items.extensions.unknown} inconnues</p>
              </div>
              <div className="preview-section">
                <h3>Paramètres</h3>
                <p>✓ {analysis.items.settings.compatible} compatibles</p>
                <p>⚠ {analysis.items.settings.unsupported} non supportés</p>
              </div>
              <div className="preview-section">
                <h3>Raccourcis</h3>
                <p>✓ {analysis.items.keybindings.compatible} compatibles</p>
              </div>
              <div className="preview-section">
                <h3>Snippets</h3>
                <p>✓ {analysis.items.snippets.detected} détectés</p>
              </div>
            </div>
            <div className="migration-actions">
              <button className="btn-secondary" onClick={handleSkip}>Annuler</button>
              <button className="btn-primary" onClick={handleMigrate}>Confirmer migration</button>
            </div>
          </div>
        )}

        {step === 'migrating' && (
          <div className="migration-content">
            <h2>Migration en cours...</h2>
            <p>Création d'un point de restauration et importation de vos données...</p>
          </div>
        )}

        {step === 'report' && report && (
          <div className="migration-content">
            <h2>🎉 Migration terminée</h2>
            <ul className="migration-list">
              <li>{report.summary.extensions.imported} extensions importées</li>
              <li>{report.summary.settings.imported} paramètres importés</li>
              <li>{report.summary.keybindings.imported} raccourcis importés</li>
              <li>{report.summary.snippets.imported} snippets importés</li>
              <li>{report.summary.themes.imported} thèmes importés</li>
            </ul>
            <div className="migration-actions">
              <button className="btn-primary" onClick={onClose}>Terminer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
