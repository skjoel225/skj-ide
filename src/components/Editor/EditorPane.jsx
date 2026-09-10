import React, { useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { detectLanguage } from '../../utils/languageDetector'
import './EditorPane.css'

// SKJ IDE Monaco theme
const SKJ_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c678dd' },
    { token: 'string', foreground: '98c379' },
    { token: 'number', foreground: 'd19a66' },
    { token: 'type', foreground: 'e5c07b' },
    { token: 'class', foreground: 'e5c07b' },
    { token: 'function', foreground: '61afef' },
    { token: 'variable', foreground: 'e06c75' },
    { token: 'operator', foreground: '56b6c2' },
  ],
  colors: {
    'editor.background': '#141420',
    'editor.foreground': '#e8e8f4',
    'editorLineNumber.foreground': '#3c3c5a',
    'editorLineNumber.activeForeground': '#7c6af7',
    'editor.lineHighlightBackground': '#1a1a2e',
    'editor.selectionBackground': '#3d3a6a',
    'editor.inactiveSelectionBackground': '#2d2a5a',
    'editorCursor.foreground': '#7c6af7',
    'editorIndentGuide.background': '#1e1e32',
    'editorIndentGuide.activeBackground': '#3c3c5a',
    'editor.findMatchBackground': '#7c6af750',
    'editor.findMatchHighlightBackground': '#5b8af030',
    'editorBracketMatch.background': '#3d3a6a',
    'editorBracketMatch.border': '#7c6af7',
    'scrollbarSlider.background': '#2a2a4840',
    'scrollbarSlider.hoverBackground': '#3a3a6040',
    'scrollbarSlider.activeBackground': '#4a4a7040',
    'minimap.background': '#111118',
  },
}

export default function EditorPane({ activeTab, tabs, onChange, onCursorChange, onSave }) {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  const activeFile = tabs.find(t => t.path === activeTab)
  const language = activeFile ? detectLanguage(activeFile.path) : 'plaintext'

  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Define custom theme
    monaco.editor.defineTheme('skj-dark', SKJ_THEME)
    monaco.editor.setTheme('skj-dark')

    // Cursor position listener
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        })
      }
    })

    // Ctrl+S save handler
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => { if (onSave) onSave() }
    )

    // Focus editor
    editor.focus()
  }, [onCursorChange, onSave])

  // Re-focus editor when switching tabs
  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => editorRef.current?.focus(), 50)
    }
  }, [activeTab])

  if (!activeFile) {
    return (
      <div className="editor-welcome">
        <div className="editor-welcome-content">
          <div className="editor-welcome-logo">⬡</div>
          <h1 className="editor-welcome-title gradient-text">SKJ IDE</h1>
          <p className="editor-welcome-sub">Open a folder to get started</p>
          <div className="editor-welcome-hints">
            <div className="hint-item"><kbd>Ctrl</kbd><kbd>P</kbd> Quick Open</div>
            <div className="hint-item"><kbd>Ctrl</kbd><kbd>S</kbd> Save</div>
            <div className="hint-item"><kbd>Ctrl</kbd><kbd>`</kbd> Terminal</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-pane">
      <Editor
        key={activeFile.path}
        value={activeFile.content ?? ''}
        language={language}
        theme="skj-dark"
        onChange={(val) => onChange(activeFile.path, val ?? '')}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          suggest: { enabled: true },
          quickSuggestions: true,
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          renderWhitespace: 'selection',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          matchBrackets: 'always',
          folding: true,
          foldingHighlight: true,
          links: true,
          mouseWheelZoom: true,
        }}
        loading={
          <div className="editor-loading">
            <div className="editor-loading-spinner" />
            Loading...
          </div>
        }
      />
    </div>
  )
}
