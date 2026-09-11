import React, { useEffect, useState } from 'react';
import { collaborationService } from '../../services/collaborationService';

export default function PermissionsModal({ onClose }) {
  const [guests, setGuests] = useState(Array.from(collaborationService.guests.entries()));

  useEffect(() => {
    const unsub = collaborationService.onChange('guests-updated', (updatedGuests) => {
      setGuests(updatedGuests);
    });
    return unsub;
  }, []);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className="dialog-modal fade-in" 
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        <h2 className="dialog-title">Manage Permissions</h2>
        <p className="dialog-message" style={{ marginBottom: '15px' }}>
          Control who can read or write files in your project.
        </p>

        <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-darker)', borderRadius: '6px', padding: '10px' }}>
          {guests.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No guests connected.
            </div>
          ) : (
            guests.map(([guestId, data]) => (
              <div key={guestId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: '500' }}>{data.username}</span>
                <select 
                  className="dialog-input" 
                  style={{ width: '120px', padding: '5px' }}
                  value={data.permission}
                  onChange={(e) => collaborationService.updateGuestPermission(guestId, e.target.value)}
                >
                  <option value="read">Read-only</option>
                  <option value="write">Read / Write</option>
                </select>
              </div>
            ))
          )}
        </div>

        <div className="dialog-actions" style={{ marginTop: '20px' }}>
          <button className="dialog-btn btn-confirm" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
