import React from 'react';
import './ChatPanel.css';

export default function PermissionDialog({ request, onRespond }) {
  if (!request) return null;

  return (
    <div className="permission-overlay">
      <div className="permission-dialog">
        <h3 className="permission-title">⚠️ Agent Permission Request</h3>
        <p className="permission-desc">The AI Agent wants to execute the following tool:</p>
        
        <div className="permission-details">
          <strong>Tool:</strong> {request.toolName}<br />
          <strong>Arguments:</strong>
          <pre className="permission-args">{JSON.stringify(request.args, null, 2)}</pre>
        </div>
        
        {request.toolName === 'run_command' && (
          <p className="permission-warning">This command will be executed in your terminal.</p>
        )}

        <div className="permission-actions">
          <button className="btn-cancel" onClick={() => onRespond(false)}>Cancel</button>
          <button className="btn-allow" onClick={() => onRespond(true)}>Allow</button>
        </div>
      </div>
    </div>
  );
}
