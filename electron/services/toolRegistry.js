const { 
  readFileTool, 
  writeFileTool, 
  editFileTool, 
  listFilesTool, 
  searchCodeTool, 
  runCommandTool 
} = require('../tools/agentTools');

class ToolRegistry {
  constructor() {
    this.tools = [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the contents of a file inside the workspace.',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path to the file.' }
            },
            required: ['path']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'write_file',
          description: 'Create or completely overwrite a file with new content.',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path to the file.' },
              content: { type: 'string', description: 'The complete new content of the file.' }
            },
            required: ['path', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'edit_file',
          description: 'Replace exactly one specific string occurrence in a file with new text.',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path to the file.' },
              oldText: { type: 'string', description: 'The exact string to be replaced.' },
              newText: { type: 'string', description: 'The new string to insert.' }
            },
            required: ['path', 'oldText', 'newText']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_files',
          description: 'List files and directories in a given path.',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Relative path to the directory (e.g., "." or "src").' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_code',
          description: 'Search for a string across all files in the workspace.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The text to search for.' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_command',
          description: 'Run a shell command in the workspace.',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'The command to execute (e.g., "npm test").' }
            },
            required: ['command']
          }
        }
      }
    ];

    this.handlers = {
      'read_file': readFileTool,
      'write_file': writeFileTool,
      'edit_file': editFileTool,
      'list_files': listFilesTool,
      'search_code': searchCodeTool,
      'run_command': runCommandTool
    };
  }

  getToolsSchema() {
    return this.tools;
  }

  async executeTool(name, args, workspace) {
    const handler = this.handlers[name];
    if (!handler) {
      throw new Error(`Tool ${name} not found.`);
    }
    return await handler(workspace, args);
  }
}

module.exports = new ToolRegistry();
