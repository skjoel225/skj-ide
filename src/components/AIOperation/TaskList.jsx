import React from 'react';

export default function TaskList({ plan }) {
  if (!plan) return <div className="task-list empty">No active plan.</div>;

  const total = plan.steps ? plan.steps.length : 0;
  const completed = plan.steps ? plan.steps.filter(s => s.status === 'completed').length : 0;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="task-list">
      <h3>TASK: {plan.task}</h3>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="steps-container">
        {plan.steps && plan.steps.map((step, i) => (
          <div key={step.id || i} className={`step-item status-${step.status || 'pending'}`}>
            <span className="step-icon">
              {step.status === 'completed' && '✓'}
              {step.status === 'running' && '⏳'}
              {(!step.status || step.status === 'pending') && '○'}
              {step.status === 'failed' && '❌'}
            </span>
            <span className="step-desc">{step.description}</span>
            <span className="step-agent badge">{step.agent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
