import React, { useState, useEffect } from 'react';
import TaskList from './TaskList';
import AgentStatus from './AgentStatus';
import ActionControls from './ActionControls';
import PermissionDialog from '../AIChat/PermissionDialog';
import './Orchestrator.css';

export default function OrchestratorView({ projectName, projectRoot }) {
  const [taskDescription, setTaskDescription] = useState('');
  const [statusEvent, setStatusEvent] = useState(null); // the latest raw status
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [permissionRequest, setPermissionRequest] = useState(null);
  
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.ai) return;

    window.electronAPI.ai.onOrchestratorStatus((data) => {
      setStatusEvent(data);
      
      const time = new Date().toLocaleTimeString();
      let logMsg = '';

      if (data.type === 'plan-started') {
        setPlan(data.plan);
        logMsg = `Plan generated: ${data.plan.task}`;
      } else if (data.type === 'step-running') {
        logMsg = `Starting step: ${data.step.description}`;
        // Update plan state
        setPlan(prev => {
          if (!prev) return prev;
          const newSteps = [...prev.steps];
          const idx = newSteps.findIndex(s => s.id === data.step.id);
          if (idx !== -1) newSteps[idx] = { ...data.step, status: 'running' };
          return { ...prev, steps: newSteps };
        });
      } else if (data.type === 'step-advanced') {
        logMsg = `Step advanced.`;
        setPlan(prev => {
          if (!prev) return prev;
          const newSteps = [...prev.steps];
          // Mark previous as completed
          const runningIdx = newSteps.findIndex(s => s.status === 'running');
          if (runningIdx !== -1) newSteps[runningIdx].status = 'completed';
          return { ...prev, steps: newSteps };
        });
      } else if (data.type === 'plan-completed') {
        logMsg = `Plan completed successfully!`;
      } else if (data.type === 'agent-status') {
        // e.g. "Working..."
        if (typeof data.status === 'string') {
          logMsg = `[${data.agent}] ${data.status}`;
        } else if (data.status && data.status.status) {
          logMsg = `[${data.agent}] ${data.status.status}`;
        } else {
          logMsg = `[${data.agent}] Update received.`;
        }
      } else if (data.type === 'error' || data.type === 'plan-failed') {
        logMsg = `ERROR: ${data.error}`;
      }

      if (logMsg) {
        setLogs(prev => [...prev, `[${time}] ${logMsg}`]);
      }
    });

    window.electronAPI.ai.onRequestPermission((req) => {
      setPermissionRequest(req);
    });

    return () => {
      window.electronAPI.ai.removeAllListeners();
    };
  }, []);

  const handleStartTask = async () => {
    if (!taskDescription.trim()) return;
    setPlan(null);
    setLogs([`[${new Date().toLocaleTimeString()}] Starting new global task...`]);
    await window.electronAPI.ai.startTask(taskDescription, projectRoot || projectName);
  };

  const handleStopTask = async () => {
    await window.electronAPI.ai.stopTask();
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Task forcefully stopped.`]);
  };

  const handlePermissionRespond = (allowed) => {
    if (permissionRequest) {
      window.electronAPI.ai.sendPermissionResponse(permissionRequest.id, allowed);
      setPermissionRequest(null);
    }
  };

  return (
    <div className="orchestrator-panel">
      <div className="orchestrator-header">
        <h2>AI Orchestrator</h2>
      </div>

      <div className="orchestrator-input-area">
        <textarea 
          placeholder="Describe a complex task (e.g. Create a complete login system)..."
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
        />
        <div className="orchestrator-controls">
          <ActionControls onStart={handleStartTask} onStop={handleStopTask} />
        </div>
      </div>

      <div className="orchestrator-content">
        <div className="orchestrator-left">
          <TaskList plan={plan} />
          <AgentStatus currentStatusEvent={statusEvent} plan={plan} />
        </div>
        
        <div className="orchestrator-right">
          <div className="orchestrator-logs">
            <h3>Agent Logs</h3>
            <div className="log-container">
              {logs.map((log, i) => (
                <div key={i} className="log-entry">{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PermissionDialog request={permissionRequest} onRespond={handlePermissionRespond} />
    </div>
  );
}
