const { EventEmitter } = require('events');
const planner = require('./planner');
const taskManager = require('./taskManager');
const agentFactory = require('../agents/specialistAgents');

const MAX_REPAIR_ATTEMPTS = 5;

class Orchestrator extends EventEmitter {
  constructor() {
    super();
    this.projectRoot = null;
    this.isStopped = false;
    this.repairAttempts = 0;

    // Listen to task manager events
    taskManager.on('plan-started', (plan) => {
      this.emit('status', { type: 'plan-started', plan });
      this.executeNextStep();
    });

    taskManager.on('step-advanced', (step) => {
      this.emit('status', { type: 'step-advanced', step });
      this.executeNextStep();
    });

    taskManager.on('plan-completed', (plan) => {
      this.emit('status', { type: 'plan-completed', plan });
    });

    taskManager.on('plan-failed', (error) => {
      this.emit('status', { type: 'plan-failed', error });
    });
    
    taskManager.on('plan-stopped', () => {
      this.emit('status', { type: 'plan-stopped' });
    });
  }

  /**
   * Starts a new global task.
   */
  async startTask(taskDescription, projectRoot) {
    this.projectRoot = projectRoot;
    this.isStopped = false;
    this.repairAttempts = 0;
    this.emit('status', { type: 'planning', message: 'Generating plan...' });

    try {
      const plan = await planner.createPlan(taskDescription);
      taskManager.startPlan(plan);
    } catch (err) {
      this.emit('status', { type: 'error', error: err.message });
    }
  }

  stopAll() {
    this.isStopped = true;
    taskManager.stopAll();
  }

  async executeNextStep() {
    if (this.isStopped) return;

    const step = taskManager.getCurrentStep();
    if (!step) return;

    taskManager.updateCurrentStepStatus('running');
    this.emit('status', { type: 'step-running', step });

    const agent = agentFactory.createAgent(step.agent);
    
    // Create a context string for the agent
    const agentTaskContext = `
PROJECT ROOT: ${this.projectRoot}
GLOBAL TASK: ${taskManager.currentPlan.task}
YOUR SPECIFIC STEP: ${step.description}

Execute this step using your available tools.`;

    try {
      const result = await agent.executeTask(agentTaskContext, this.projectRoot, (agentStatus) => {
        this.emit('status', { type: 'agent-status', agent: step.agent, status: agentStatus });
      });

      if (this.isStopped) return;

      if (result.success) {
        this.repairAttempts = 0; // reset on success
        taskManager.advanceStep();
      } else {
        await this.handleAgentFailure(step, result.error);
      }
    } catch (err) {
      if (this.isStopped) return;
      await this.handleAgentFailure(step, err.message);
    }
  }

  async handleAgentFailure(step, errorMsg) {
    if (this.isStopped) return;
    
    if (this.repairAttempts >= MAX_REPAIR_ATTEMPTS) {
      taskManager.failPlan(`Failed after ${MAX_REPAIR_ATTEMPTS} repair attempts. Last error: ${errorMsg}`);
      return;
    }

    this.repairAttempts++;
    this.emit('status', { 
      type: 'agent-status', 
      agent: 'debugger', 
      status: { status: `Attempting repair ${this.repairAttempts}/${MAX_REPAIR_ATTEMPTS}...` }
    });

    const debuggerAgent = agentFactory.createAgent('debugger');
    const debugContext = `
PROJECT ROOT: ${this.projectRoot}
TASK THAT FAILED: ${step.description}
ERROR ENCOUNTERED: ${errorMsg}

Please diagnose and fix this error.`;

    try {
      const result = await debuggerAgent.executeTask(debugContext, this.projectRoot, (agentStatus) => {
        this.emit('status', { type: 'agent-status', agent: 'debugger', status: agentStatus });
      });

      if (this.isStopped) return;

      if (result.success) {
        this.emit('status', { type: 'agent-status', agent: 'debugger', status: { status: 'Repair successful.' } });
        // After repair, we retry the ORIGINAL step.
        this.executeNextStep();
      } else {
        // Debugger failed itself, escalate
        this.handleAgentFailure(step, `Debugger failed: ${result.error}`);
      }
    } catch (err) {
      this.handleAgentFailure(step, `Debugger crashed: ${err.message}`);
    }
  }
}

module.exports = new Orchestrator();
