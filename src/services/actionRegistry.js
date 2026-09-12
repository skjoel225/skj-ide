/**
 * ActionRegistry
 * Provides a VS Code-like structure for registering and evaluating commands and menus.
 */

class ActionRegistry {
  constructor() {
    this.commands = new Map();
    this.menus = {
      'editor/title': []
    };
  }

  /**
   * Register a command.
   * @param {string} id - The command ID (e.g. 'python.runFile')
   * @param {function} handler - The function to execute
   */
  registerCommand(id, handler) {
    this.commands.set(id, handler);
  }

  /**
   * Execute a command by ID.
   * @param {string} id - The command ID
   * @param  {...any} args - Arguments to pass to the handler
   */
  executeCommand(id, ...args) {
    const handler = this.commands.get(id);
    if (handler) {
      return handler(...args);
    }
    console.warn(`Command not found: ${id}`);
  }

  /**
   * Register an action to a specific menu location.
   * @param {string} menuId - The menu location (e.g. 'editor/title')
   * @param {object} action - { command: string, title: string, icon: string, when: string }
   */
  registerAction(menuId, action) {
    if (!this.menus[menuId]) {
      this.menus[menuId] = [];
    }
    this.menus[menuId].push(action);
  }

  /**
   * Evaluate a simple 'when' clause.
   * Supports clauses like: 'resourceLangId == python'
   * @param {string} whenClause - The when string
   * @param {object} context - Context variables, e.g. { resourceLangId: 'python' }
   */
  evaluateWhen(whenClause, context) {
    if (!whenClause) return true; // Empty when clause means always visible

    // Regex evaluator for `key =~ /pattern/`
    const regexMatch = whenClause.match(/([a-zA-Z0-9_]+)\s*=~\s*\/(.+)\//);
    if (regexMatch) {
      const [, key, pattern] = regexMatch;
      const regex = new RegExp(pattern);
      return regex.test(context[key]);
    }

    // Very basic evaluator for `key == value`
    // In Phase 5, this should be replaced with a proper parser (e.g. VS Code's context key evaluator)
    const match = whenClause.match(/([a-zA-Z0-9_]+)\s*==\s*([a-zA-Z0-9_]+)/);
    if (match) {
      const [, key, expectedValue] = match;
      return context[key] === expectedValue;
    }
    return false;
  }

  /**
   * Get all actions for a menu that are active given the context.
   * @param {string} menuId - The menu location
   * @param {object} context - Context variables
   */
  getActionsForMenu(menuId, context) {
    const actions = this.menus[menuId] || [];
    return actions.filter(action => this.evaluateWhen(action.when, context));
  }
}

export const actionRegistry = new ActionRegistry();

// -----------------------------------------------------------------------------
// Core Actions Registration
// -----------------------------------------------------------------------------

// 1. Generic Run File Action
actionRegistry.registerCommand('code.execInTerminal', (context) => {
  if (context && context.filePath) {
    const langRunners = {
      python: 'python',
      javascript: 'node',
      ruby: 'ruby',
      php: 'php',
      shell: 'bash'
    };
    
    const langId = context.resourceLangId || 'python';
    const runner = langRunners[langId] || langId;

    // For now, we dispatch a DOM event that TerminalTabs can intercept to run the command
    window.dispatchEvent(new CustomEvent('skj:terminal:execute', { 
      detail: { command: `${runner} "${context.filePath}"` } 
    }));
  }
});

actionRegistry.registerAction('editor/title', {
  command: 'code.execInTerminal',
  title: 'Run File',
  icon: '▶',
  when: 'resourceLangId =~ /python|javascript|ruby|php|shell/'
});

// 2. HTML Live Preview Action
actionRegistry.registerCommand('html.preview', (context) => {
  if (context && context.filePath) {
    const api = window.electronAPI;
    if (api && api.shell && api.shell.openPath) {
      api.shell.openPath(context.filePath);
    } else {
      console.warn("api.shell.openPath not available");
    }
  }
});

actionRegistry.registerAction('editor/title', {
  command: 'html.preview',
  title: 'Open in Browser',
  icon: '🌐',
  when: 'resourceLangId == html'
});
