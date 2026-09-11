import React, { useState } from 'react';

export default function CollaborationModal({ type, code, onClose, onJoin, onCreate }) {
  const [inputCode, setInputCode] = useState('');
  const [username, setUsername] = useState('');

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className="dialog-modal fade-in" 
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        {type === 'create-prompt' ? (
          <>
            <h2 className="dialog-title">Create Session</h2>
            <p className="dialog-message">
              Enter your username before creating the session:
            </p>
            <div className="dialog-input-group" style={{ marginTop: '15px', marginBottom: '15px' }}>
              <input
                className="dialog-input"
                type="text"
                placeholder="e.g. Alice"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dialog-actions">
              <button className="dialog-btn btn-cancel" onClick={onClose}>Cancel</button>
              <button 
                className="dialog-btn btn-confirm" 
                onClick={() => onCreate(username || 'Host')}
                disabled={!username.trim()}
              >
                Create
              </button>
            </div>
          </>
        ) : type === 'create-success' ? (
          <>
            <h2 className="dialog-title">Session Created</h2>
            <p className="dialog-message">
              Share this 8-character code with your friends to allow them to join your workspace:
            </p>
            <div style={{ padding: '15px', background: 'var(--bg-darker)', borderRadius: '6px', textAlign: 'center', marginTop: '15px', marginBottom: '15px' }}>
              <strong style={{ fontSize: '24px', letterSpacing: '2px', color: 'var(--accent-color)' }}>{code}</strong>
            </div>
            <p className="dialog-message dialog-warning" style={{ fontSize: '12px', marginTop: 0 }}>
              Warning: New guests have Read-Only access by default. You can change this in Permissions.
            </p>
            <div className="dialog-actions">
              <button 
                className="dialog-btn btn-confirm" 
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  onClose();
                }}
              >
                Copy & Close
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="dialog-title">Join Collaboration Session</h2>
            <p className="dialog-message">
              Enter the 8-character code provided by the host:
            </p>
            <div className="dialog-input-group" style={{ marginTop: '15px', marginBottom: '10px' }}>
              <input
                className="dialog-input"
                type="text"
                placeholder="Code (e.g. A1B2C3D4)"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                maxLength={8}
                autoFocus
              />
            </div>
            <div className="dialog-input-group" style={{ marginBottom: '15px' }}>
              <input
                className="dialog-input"
                type="text"
                placeholder="Your Username (e.g. Bob)"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="dialog-actions">
              <button className="dialog-btn btn-cancel" onClick={onClose}>Cancel</button>
              <button 
                className="dialog-btn btn-confirm" 
                onClick={() => onJoin(inputCode, username || 'Guest')}
                disabled={inputCode.length !== 8 || !username.trim()}
              >
                Join
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
