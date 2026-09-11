const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const https = require('https');
const execAsync = util.promisify(exec);

// Security checks
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', '.cache'];
const EXCLUDED_FILES = ['.env', '.env.local', '.env.production', '.env.development', 'package-lock.json', 'yarn.lock'];
const EXCLUDED_EXTENSIONS = ['.pem', '.key', '.cert', '.log', '.jpg', '.png', '.gif', '.ico'];

function isExcluded(targetPath) {
  const parts = targetPath.split(path.sep);
  const name = parts[parts.length - 1];
  const lower = name.toLowerCase();
  
  if (EXCLUDED_DIRS.some(dir => parts.includes(dir))) return true;
  if (EXCLUDED_FILES.some(f => lower === f)) return true;
  if (EXCLUDED_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
  
  return false;
}

function resolveAndValidatePath(workspacePath, targetPath) {
  const absolutePath = path.resolve(workspacePath, targetPath);
  if (!absolutePath.startsWith(path.resolve(workspacePath))) {
    throw new Error('Access denied: Path is outside the workspace.');
  }
  if (isExcluded(absolutePath)) {
    throw new Error('Access denied: File or directory is protected.');
  }
  return absolutePath;
}

async function readFileTool(workspace, args) {
  try {
    const targetPath = resolveAndValidatePath(workspace, args.path);
    const content = await fs.readFile(targetPath, 'utf8');
    return { success: true, path: args.path, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function writeFileTool(workspace, args) {
  try {
    const targetPath = resolveAndValidatePath(workspace, args.path);
    // Ensure directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, args.content, 'utf8');
    return { success: true, path: args.path };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function editFileTool(workspace, args) {
  try {
    const targetPath = resolveAndValidatePath(workspace, args.path);
    let content = await fs.readFile(targetPath, 'utf8');
    
    const count = content.split(args.oldText).length - 1;
    if (count === 0) {
      throw new Error('Edit failed: Target text was not found.');
    }
    if (count > 1) {
      throw new Error('Edit failed: The target text matches multiple locations. Please provide a more specific target.');
    }
    
    content = content.replace(args.oldText, args.newText);
    await fs.writeFile(targetPath, content, 'utf8');
    return { success: true, path: args.path };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function listFilesTool(workspace, args) {
  try {
    const targetPath = resolveAndValidatePath(workspace, args.path || '.');
    
    const results = [];
    async function walk(dir, depth = 0) {
      if (depth > 4) return; // Prevent too deep traversal
      if (results.length > 200) return; // Prevent too many files
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (isExcluded(entry.name)) continue;
        
        const relPath = path.relative(workspace, path.join(dir, entry.name)).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          results.push(relPath + '/');
          await walk(path.join(dir, entry.name), depth + 1);
        } else {
          results.push(relPath);
        }
      }
    }
    
    await walk(targetPath);
    return { success: true, files: results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function searchCodeTool(workspace, args) {
  try {
    // Basic search across allowed files
    // In a real IDE, use ripgrep or similar. Here we do a simple Node JS grep.
    const query = args.query;
    const results = [];
    
    async function searchDir(dir) {
      if (results.length > 50) return;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (isExcluded(entry.name)) continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await searchDir(fullPath);
        } else {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes(query)) {
                results.push(`${path.relative(workspace, fullPath).replace(/\\/g, '/')}:${i + 1}`);
                if (results.length > 50) return;
              }
            }
          } catch (e) {
            // Ignore unreadable files
          }
        }
      }
    }
    
    await searchDir(workspace);
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function runCommandTool(workspace, args) {
  try {
    // Timeout of 120 seconds
    const { stdout, stderr } = await execAsync(args.command, { cwd: workspace, timeout: 120000 });
    return { success: true, command: args.command, stdout: stdout.slice(0, 5000), stderr: stderr.slice(0, 5000), exitCode: 0 };
  } catch (err) {
    return { 
      success: false, 
      command: args.command, 
      stdout: err.stdout ? err.stdout.slice(0, 5000) : '', 
      stderr: err.stderr ? err.stderr.slice(0, 5000) : err.message, 
      exitCode: err.code || 1 
    };
  }
}

async function createDirTool(workspace, args) {
  try {
    const targetPath = resolveAndValidatePath(workspace, args.path);
    await fs.mkdir(targetPath, { recursive: true });
    return { success: true, path: args.path };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function searchWebTool(workspace, args) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(args.query);
    // DuckDuckGo Lite HTML interface for simple scraping without API key
    const url = `https://lite.duckduckgo.com/lite/?q=${query}`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Extract basic snippets from HTML
        const snippets = [];
        const regex = /class="result-snippet">([\s\S]*?)<\/td>/g;
        let match;
        while ((match = regex.exec(data)) !== null && snippets.length < 5) {
          // Remove HTML tags
          let text = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
          if (text) snippets.push(text);
        }
        resolve({ success: true, results: snippets.length > 0 ? snippets : ['No immediate snippets found.'] });
      });
    }).on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

module.exports = {
  readFileTool,
  writeFileTool,
  editFileTool,
  listFilesTool,
  searchCodeTool,
  runCommandTool,
  createDirTool,
  searchWebTool
};
