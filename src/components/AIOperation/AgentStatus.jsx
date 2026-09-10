import React from 'react';

const allAgents = ['developer', 'frontend', 'backend', 'debugger', 'tester', 'reviewer'];

export default function AgentStatus({ currentStatusEvent, plan }) {
  // Determine the status of each agent based on the plan and currentStatusEvent
  
  const getAgentState = (agentName) => {
    // If orchestrator is planning
    if (currentStatusEvent && currentStatusEvent.type === 'planning') {
      return { status: 'Waiting', icon: '○' };
    }

    // Check if this agent is currently running
    if (currentStatusEvent && (currentStatusEvent.type === 'step-running' || currentStatusEvent.type === 'agent-status')) {
      const activeAgent = currentStatusEvent.type === 'agent-status' ? currentStatusEvent.agent : currentStatusEvent.step.agent;
      if (activeAgent === agentName) {
        return { status: 'Working...', icon: '●', active: true };
      }
    }

    // Check if agent has completed tasks in the plan
    if (plan && plan.steps) {
      const mySteps = plan.steps.filter(s => s.agent === agentName);
      if (mySteps.length > 0 && mySteps.every(s => s.status === 'completed')) {
        return { status: 'Done', icon: '✓' };
      }
    }

    return { status: 'Waiting', icon: '○' };
  };

  return (
    <div className="agent-status-panel">
      <h3>AI AGENTS</h3>
      <div className="agent-list">
        {allAgents.map(agent => {
          const state = getAgentState(agent);
          return (
            <div key={agent} className={`agent-row ${state.active ? 'active' : ''}`}>
              <span className="agent-icon">🤖</span>
              <span className="agent-name">{agent.charAt(0).toUpperCase() + agent.slice(1)}</span>
              <span className="agent-state">
                <span className="state-icon">{state.icon}</span> {state.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
