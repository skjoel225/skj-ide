const { EventEmitter } = require('events');

class TaskManager extends EventEmitter {
  constructor() {
    super();
    this.currentPlan = null;
    this.currentStepIndex = -1;
  }

  /**
   * Initializes a new plan.
   * @param {Object} plan The plan from the planner
   */
  startPlan(plan) {
    this.currentPlan = plan;
    this.currentStepIndex = 0;
    this.emit('plan-started', this.currentPlan);
  }

  /**
   * Retrieves the current step to execute.
   * @returns {Object|null} The current step or null if done
   */
  getCurrentStep() {
    if (!this.currentPlan || !this.currentPlan.steps) return null;
    if (this.currentStepIndex >= this.currentPlan.steps.length) return null;
    
    return this.currentPlan.steps[this.currentStepIndex];
  }

  /**
   * Updates the status of the current step.
   * @param {string} status The new status (running, completed, failed, etc.)
   */
  updateCurrentStepStatus(status) {
    const step = this.getCurrentStep();
    if (step) {
      step.status = status;
      this.emit('step-updated', { stepIndex: this.currentStepIndex, step });
    }
  }

  /**
   * Moves to the next step.
   */
  advanceStep() {
    this.updateCurrentStepStatus('completed');
    this.currentStepIndex++;
    
    const nextStep = this.getCurrentStep();
    if (nextStep) {
      this.emit('step-advanced', nextStep);
    } else {
      this.emit('plan-completed', this.currentPlan);
    }
  }

  /**
   * Fails the plan.
   */
  failPlan(error) {
    this.updateCurrentStepStatus('failed');
    this.emit('plan-failed', error);
  }
  
  /**
   * Halts everything
   */
  stopAll() {
    if (this.currentPlan) {
      this.updateCurrentStepStatus('stopped');
      this.emit('plan-stopped');
    }
  }

  getPlanStatus() {
    return {
      plan: this.currentPlan,
      currentStepIndex: this.currentStepIndex
    };
  }
}

module.exports = new TaskManager();
