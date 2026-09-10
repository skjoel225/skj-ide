/**
 * Manages the context sent to the DeepSeek API.
 */
class ContextManager {
  constructor() {
    this.excludedFiles = [
      '.env',
      '.env.local',
      '.env.production',
      '.env.development',
      '.git',
      'node_modules',
      'dist',
      'build',
      'package-lock.json',
      'yarn.lock'
    ];
    this.excludedExtensions = [
      '.pem',
      '.key',
      '.cert',
      '.log',
      '.jpg',
      '.png',
      '.gif',
      '.ico'
    ];
  }

  isExcluded(filename) {
    const lower = filename.toLowerCase();
    if (this.excludedFiles.some(ex => lower.includes(ex))) return true;
    if (this.excludedExtensions.some(ext => lower.endsWith(ext))) return true;
    return false;
  }

  /**
   * Generates a simplified tree structure of the project as a string
   */
  generateTreeString(tree, depth = 0, maxDepth = 3) {
    if (depth > maxDepth) return '  '.repeat(depth) + '...\n';
    
    let result = '';
    const indent = '  '.repeat(depth);
    
    for (const node of tree) {
      if (this.isExcluded(node.name)) continue;
      
      result += `${indent}${node.name}${node.isDir ? '/' : ''}\n`;
      if (node.isDir && node.children && node.children.length > 0) {
        result += this.generateTreeString(node.children, depth + 1, maxDepth);
      }
    }
    return result;
  }

  /**
   * Constructs the system prompt with context
   */
  buildSystemPrompt(projectName, fileTree, activeTabPath, tabs) {
    let prompt = `You are an AI coding assistant integrated into SKJ IDE.
You are powered by DeepSeek API.

PROJECT INFORMATION:
Project name: ${projectName || 'Unknown'}

PROJECT STRUCTURE:
${this.generateTreeString(fileTree)}
`;

    if (activeTabPath && !this.isExcluded(activeTabPath)) {
      const activeTab = tabs.find(t => t.path === activeTabPath);
      const activeContent = activeTab ? activeTab.content : 'Content not loaded.';
      
      prompt += `
CURRENT FILE:
${activeTabPath}

CURRENT FILE CONTENT:
\`\`\`
${activeContent}
\`\`\`
`;
    }

    prompt += `
Answer the user's question based on the provided project context.
Do not claim to have accessed files that were not provided.
Provide your response in Markdown format. For code blocks, always specify the language.`;

    return prompt;
  }
}

export const contextManager = new ContextManager();
