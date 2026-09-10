import React from 'react';

export default function ActionControls({ onStart, onStop }) {
  return (
    <div className="action-controls">
      <button className="btn-start" onClick={onStart}>▶ Start Task</button>
      <button className="btn-stop" onClick={onStop}>⏹ STOP ALL</button>
    </div>
  );
}
