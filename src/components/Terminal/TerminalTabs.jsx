import React, { useState, useCallback } from 'react'
import TerminalPane from './TerminalPane'
import './TerminalTabs.css'

let nextId = 1

export default function TerminalTabs({ cwd, isOpen }) {
  const [terminals, setTerminals] = useState([
    { id: 'term-1', label: 'Terminal 1' }
  ])
  const [activeTerminal, setActiveTerminal] = useState('term-1')

  const createTerminal = useCallback(() => {
    nextId++
    const id = `term-${nextId}`
    const label = `Terminal ${nextId}`
    setTerminals(prev => [...prev, { id, label }])
    setActiveTerminal(id)
  }, [])

  const closeTerminal = useCallback((id) => {
    setTerminals(prev => {
      const remaining = prev.filter(t => t.id !== id)
      if (remaining.length === 0) {
        // Always keep at least one terminal placeholder
        return [{ id: 'term-1', label: 'Terminal 1' }]
      }
      return remaining
    })
    setActiveTerminal(prev => {
      if (prev === id) {
        const remaining = terminals.filter(t => t.id !== id)
        return remaining[remaining.length - 1]?.id || 'term-1'
      }
      return prev
    })
  }, [terminals])

  if (!isOpen) return null

  return (
    <div className="terminal-panel">
      {/* Terminal tab bar */}
      <div className="terminal-tabbar">
        <div className="terminal-tabs-scroll">
          {terminals.map(term => (
            <div
              key={term.id}
              className={`terminal-tab ${activeTerminal === term.id ? 'active' : ''}`}
              onClick={() => setActiveTerminal(term.id)}
              role="tab"
              aria-selected={activeTerminal === term.id}
            >
              <span className="terminal-tab-icon">$</span>
              <span>{term.label}</span>
              {terminals.length > 1 && (
                <button
                  className="terminal-tab-close"
                  onClick={(e) => { e.stopPropagation(); closeTerminal(term.id) }}
                  title="Close terminal"
                  aria-label="Close terminal"
                >×</button>
              )}
            </div>
          ))}
        </div>

        <div className="terminal-actions">
          <button
            className="terminal-action-btn"
            onClick={createTerminal}
            title="New Terminal"
            aria-label="New terminal"
          >+</button>
        </div>
      </div>

      {/* Terminal instances */}
      <div className="terminal-content">
        {terminals.map(term => (
          <TerminalPane
            key={term.id}
            id={term.id}
            cwd={cwd}
            isActive={activeTerminal === term.id}
          />
        ))}
      </div>
    </div>
  )
}
