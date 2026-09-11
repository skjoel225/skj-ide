const aiClient = require('../services/aiClient');
const toolRegistry = require('../services/toolRegistry');
const agentTools = require('../tools/agentTools');
const permissionService = require('../services/permissionService');

class BaseAgent {
  constructor(role, systemPrompt) {
    this.role = role;
    this.systemPrompt = systemPrompt;
    this.MAX_STEPS = 20; // Per step limit
  }

  /**
   * Executes a specific task assigned to this agent.
   * @param {string} taskDescription The description of what needs to be done.
   * @param {string} projectRoot The root directory of the workspace.
   * @param {Function} onStatusUpdate Callback for UI status updates.
   */
  async executeTask(taskDescription, projectRoot, onStatusUpdate) {
    let messages = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: taskDescription }
    ];

    let steps = 0;
    
    while (steps < this.MAX_STEPS) {
      steps++;
      onStatusUpdate(`Thinking (Step ${steps})`);

      try {
        const response = await aiClient.sendMessage(messages, toolRegistry.getToolsSchema());

        if (!response.success) {
          return { success: false, error: response.error };
        }

        const aiMessage = response.data.message;
        messages.push(aiMessage); // Append AI response to history

        // If there are no tool calls, the agent has finished its thought process for this task
        if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
          return { success: true, result: aiMessage.content, messages };
        }

        // Process tool calls sequentially
        for (const toolCall of aiMessage.tool_calls) {
          onStatusUpdate(`Executing tool: ${toolCall.function.name}`);
          
          let args;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: "Invalid JSON in arguments" })
            });
            continue;
          }

          // PERMISSIONS CHECK
          const requiresPermission = ['write_file', 'edit_file', 'run_command'].includes(toolCall.function.name);
          if (requiresPermission) {
            onStatusUpdate(`Waiting for permission: ${toolCall.function.name}`);
            const allowed = await permissionService.requestPermission(toolCall.function.name, args);
            if (!allowed) {
               messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                content: JSON.stringify({ error: "Permission denied by user." })
              });
              continue;
            }
          }

          // EXECUTE TOOL
          let toolResult;
          try {
            switch (toolCall.function.name) {
              case 'read_file':
                toolResult = await agentTools.read_file(args.path, projectRoot);
                break;
              case 'write_file':
                toolResult = await agentTools.write_file(args.path, args.content, projectRoot);
                break;
              case 'edit_file':
                toolResult = await agentTools.edit_file(args.path, args.oldText, args.newText, projectRoot);
                break;
              case 'list_files':
                toolResult = await agentTools.list_files(args.path || '.', projectRoot);
                break;
              case 'search_code':
                toolResult = await agentTools.search_code(args.query, projectRoot);
                break;
              case 'run_command':
                toolResult = await agentTools.run_command(args.command, projectRoot);
                break;
              default:
                toolResult = { error: `Tool ${toolCall.function.name} not found.` };
            }
          } catch (error) {
            toolResult = { error: error.message };
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
          });
        }
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: "Max steps reached before completion." };
  }
}

module.exports = BaseAgent;
