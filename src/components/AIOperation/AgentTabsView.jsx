import React, { useState } from 'react';
import AgentSession from './AgentSession';
import './AgentTabsView.css';

export default function AgentTabsView(props) {
  const [sessions, setSessions] = useState([
    { id: 'session-1', name: 'Agent 1', messages: [] }
  ]);
  const [activeSessionId, setActiveSessionId] = useState('session-1');
  const [editSessionId, setEditSessionId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAddSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      name: `Agent ${sessions.length + 1}`,
      messages: []
    };
    setSessions([...sessions, newSession]);
    setActiveSessionId(newId);
  };

  const handleUpdateSession = (id, updates) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const startRename = (session) => {
    setEditSessionId(session.id);
    setEditName(session.name);
  };

  const commitRename = () => {
    if (editSessionId && editName.trim()) {
      handleUpdateSession(editSessionId, { name: editName.trim() });
    }
    setEditSessionId(null);
  };

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div className="agent-tabs-container">
      <div className="agent-tabs-header">
        <div className="agent-tabs-list">
          {sessions.map(s => (
            <div 
              key={s.id} 
              className={`agent-tab ${s.id === activeSessionId ? 'active' : ''}`}
              onClick={() => setActiveSessionId(s.id)}
              onDoubleClick={() => startRename(s)}
            >
              {editSessionId === s.id ? (
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => e.key === 'Enter' && commitRename()}
                  autoFocus
                  className="agent-tab-input"
                />
              ) : (
                <span className="agent-tab-name">{s.name}</span>
              )}
            </div>
          ))}
        </div>
        <button className="agent-tab-add" onClick={handleAddSession} title="New Agent">+</button>
      </div>
      
      <div className="agent-tabs-content">
        <AgentSession 
          key={activeSession.id} // key forces remount or isolates state per tab if needed, but it's better to pass it as props and rely on AgentSession state
          session={activeSession}
          onUpdateSession={handleUpdateSession}
          {...props} 
        />
      </div>
    </div>
  );
}
