const deepseekService = require('./deepseekService');
const toolRegistry = require('./toolRegistry');
const permissionService = require('./permissionService');
const { ipcMain } = require('electron');

class AgentService {
  constructor() {
    this.MAX_STEPS = 30;
    this.mainWindow = null;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  /**
   * Run the agent loop
   * @param {Array} initialMessages 
   * @param {string} workspace 
   * @param {string} sessionId
   */
  async runAgentLoop(initialMessages, workspace, sessionId) {
    const toolsSchema = toolRegistry.getToolsSchema();
    let messages = [...initialMessages];
    let stepCount = 0;
    let isFinished = false;
    let finalAnswer = null;

    try {
      while (stepCount < this.MAX_STEPS && !isFinished) {
        stepCount++;
        
        // Notify frontend that we are thinking
        this.notifyFrontend('agent:status', { sessionId, status: 'thinking' });

        const responseMessage = await deepseekService.sendMessage(messages, toolsSchema);
        
        messages.push(responseMessage);

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
          // Process tool calls
          for (const toolCall of responseMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

            this.notifyFrontend('agent:status', { 
              sessionId,
              status: 'tool_call', 
              tool: toolName, 
              args: toolArgs 
            });

            // Check permissions
            const isAllowed = await permissionService.checkPermission(toolName, toolArgs);

            let toolResultStr;
            if (!isAllowed) {
              toolResultStr = JSON.stringify({
                success: false,
                error: 'Permission denied by user.'
              });
            } else {
              // Execute tool
              try {
                this.notifyFrontend('agent:status', { 
                  sessionId,
                  status: 'tool_executing', 
                  tool: toolName 
                });
                const result = await toolRegistry.executeTool(toolName, toolArgs, workspace);
                toolResultStr = JSON.stringify(result);
                
                // If it was a write operation, notify frontend to refresh
                if (['write_file', 'edit_file'].includes(toolName) && result.success) {
                  this.notifyFrontend('agent:file-changed', { sessionId, path: result.path });
                }
              } catch (err) {
                toolResultStr = JSON.stringify({
                  success: false,
                  error: err.message
                });
              }
            }

            // Append tool result to messages
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: toolResultStr
            });

            this.notifyFrontend('agent:status', { 
              sessionId,
              status: 'tool_result', 
              tool: toolName,
              result: toolResultStr
            });
          }
        } else {
          // No tool calls, we have the final answer
          finalAnswer = responseMessage.content;
          isFinished = true;
        }
      }

      if (!isFinished) {
        finalAnswer = "Agent stopped: Maximum number of tool calls reached.";
      }

      return { success: true, answer: finalAnswer, messages };
    } catch (err) {
      console.error('Agent loop error:', err);
      return { success: false, error: err.message, messages };
    }
  }

  notifyFrontend(channel, data) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

module.exports = new AgentService();
