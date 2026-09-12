import React from 'react';
import './ActivityBar.css';

export default function ActivityBar({ activeActivity, onSelectActivity, onOpenSettings }) {
  const activities = [
    { id: 'explorer', icon: '📁', title: 'Explorer' },
    { id: 'search', icon: '🔍', title: 'Search' },
    { id: 'extensions', icon: '🧩', title: 'Extensions' },
    { id: 'agent', icon: '🤖', title: 'AI Agent' }
  ];

  return (
    <div className="activity-bar">
      <div className="activity-bar-top">
        {activities.map(act => (
          <div 
            key={act.id}
            className={`activity-item ${activeActivity === act.id ? 'active' : ''}`}
            onClick={() => onSelectActivity(act.id)}
            title={act.title}
          >
            {act.icon}
          </div>
        ))}
      </div>
      <div className="activity-bar-bottom">
        <div 
          className="activity-item"
          onClick={onOpenSettings}
          title="Settings"
        >
          ⚙️
        </div>
      </div>
    </div>
  );
}
