import React from 'react'
import { getLanguageLabel } from '../../utils/languageDetector'
import './StatusBar.css'

export default function StatusBar({ activeFile, cursorPosition, language, encoding, indentation, isOnline = true }) {
  return (
    <div className="statusbar" role="status" aria-label="Status bar">
      <div className="statusbar-left">
        <span className="statusbar-item statusbar-network" title={isOnline ? "Online" : "Offline"}>
          <span style={{ color: isOnline ? 'var(--text-color)' : '#e74c3c', marginRight: '4px' }}>●</span>
          {isOnline ? 'Online' : 'Offline'}
        </span>

        {activeFile ? (
          <span className="statusbar-item statusbar-file" title={activeFile}>
            <span className="statusbar-icon">📄</span>
            <span className="truncate">{activeFile.split(/[\\/]/).pop()}</span>
          </span>
        ) : (
          <span className="statusbar-item statusbar-brand">SKJ IDE</span>
        )}
      </div>

      <div className="statusbar-right">
        {cursorPosition && (
          <span className="statusbar-item" title="Cursor position">
            Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
          </span>
        )}
        {language && (
          <span className="statusbar-item statusbar-lang" title="Language">
            {getLanguageLabel(language)}
          </span>
        )}
        {encoding && (
          <span className="statusbar-item" title="File encoding">
            {encoding}
          </span>
        )}
        {indentation && (
          <span className="statusbar-item" title="Indentation">
            {indentation}
          </span>
        )}
      </div>
    </div>
  )
}
