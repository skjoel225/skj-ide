class RiskManager {
  /**
   * Assesses the risk level of a given tool call.
   * Returns 'low', 'medium', 'high', or 'critical'.
   */
  assessRisk(toolName, args) {
    if (['read_file', 'list_files', 'search_code'].includes(toolName)) {
      return 'low';
    }

    if (toolName === 'edit_file') {
      return 'medium';
    }

    if (toolName === 'write_file') {
      // Overwriting files entirely is medium, unless it's a critical config file
      const criticalFiles = ['.env', 'package.json', 'webpack.config.js', 'vite.config.js'];
      if (args && args.path && criticalFiles.some(f => args.path.endsWith(f))) {
        return 'high';
      }
      return 'medium';
    }

    if (toolName === 'run_command') {
      const command = (args && args.command) ? args.command.toLowerCase() : '';
      
      // Critical commands that could destroy data or reset state
      if (command.includes('git reset --hard') || 
          command.includes('git clean') || 
          command.includes('rm -rf') ||
          command.includes('git push') ||
          command.includes('git branch -d') ||
          command.includes('npm uninstall')) {
        return 'critical';
      }

      // High commands that are generally dangerous
      if (command.includes('rm ') || command.includes('del ') || command.includes('drop')) {
        return 'high';
      }

      return 'medium';
    }

    return 'medium'; // Default fallback
  }
}

module.exports = new RiskManager();
