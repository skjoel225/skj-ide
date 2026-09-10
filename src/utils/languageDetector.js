/**
 * languageDetector.js
 * Maps file extensions to Monaco Editor language identifiers.
 * Extensible — add new mappings as needed.
 */

const EXTENSION_MAP = {
  // JavaScript
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',

  // TypeScript
  ts: 'typescript',
  tsx: 'typescript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',

  // Data
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  xml: 'xml',
  svg: 'xml',

  // Markdown / Text
  md: 'markdown',
  mdx: 'markdown',
  txt: 'plaintext',
  rst: 'restructuredtext',

  // Server-side
  py: 'python',
  rb: 'ruby',
  php: 'php',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  cs: 'csharp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  swift: 'swift',
  dart: 'dart',
  lua: 'lua',
  r: 'r',
  scala: 'scala',
  groovy: 'groovy',
  perl: 'perl',
  pl: 'perl',

  // Shell / Config
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  dockerfile: 'dockerfile',
  Dockerfile: 'dockerfile',
  env: 'plaintext',
  gitignore: 'plaintext',
  editorconfig: 'ini',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',

  // SQL
  sql: 'sql',
  mysql: 'sql',
  pgsql: 'pgsql',

  // Other
  graphql: 'graphql',
  gql: 'graphql',
  proto: 'protobuf',
  tex: 'latex',
}

/**
 * Detect Monaco language from a file path or name
 * @param {string} filePath
 * @returns {string} Monaco language ID
 */
export function detectLanguage(filePath) {
  if (!filePath) return 'plaintext'

  const filename = filePath.split(/[\\/]/).pop()

  // Handle files with no extension but known names
  const knownFilenames = {
    'Dockerfile': 'dockerfile',
    'Makefile': 'makefile',
    'makefile': 'makefile',
    '.gitignore': 'plaintext',
    '.env': 'plaintext',
    '.babelrc': 'json',
    '.eslintrc': 'json',
  }
  if (knownFilenames[filename]) return knownFilenames[filename]

  // Get extension
  const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''
  return EXTENSION_MAP[ext] || 'plaintext'
}

/**
 * Get a display-friendly language name
 * @param {string} monacoLang
 * @returns {string}
 */
export function getLanguageLabel(monacoLang) {
  const labels = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    less: 'Less',
    json: 'JSON',
    yaml: 'YAML',
    markdown: 'Markdown',
    python: 'Python',
    ruby: 'Ruby',
    php: 'PHP',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    kotlin: 'Kotlin',
    csharp: 'C#',
    cpp: 'C++',
    c: 'C',
    swift: 'Swift',
    shell: 'Shell',
    powershell: 'PowerShell',
    dockerfile: 'Dockerfile',
    sql: 'SQL',
    graphql: 'GraphQL',
    plaintext: 'Plain Text',
    xml: 'XML',
  }
  return labels[monacoLang] || monacoLang
}
