import React, { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { terminalService } from '../../services/terminalService'
import './TerminalPane.css'

export default function TerminalPane({ id, cwd, isActive }) {
  const containerRef = useRef(null)
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)
  const isInitialized = useRef(false)

  const initTerminal = useCallback(async () => {
    if (isInitialized.current || !containerRef.current) return
    isInitialized.current = true

    // Create xterm instance
    const term = new Terminal({
      theme: {
        background: '#0d0d14',
        foreground: '#e8e8f4',
        cursor: '#7c6af7',
        cursorAccent: '#0d0d14',
        black: '#1a1a2e',
        red: '#f05060',
        green: '#4ecdc4',
        yellow: '#f0a040',
        blue: '#5b8af0',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#e8e8f4',
        brightBlack: '#5c5c7a',
        brightRed: '#f07080',
        brightGreen: '#6eddcc',
        brightYellow: '#f0b060',
        brightBlue: '#7b9af0',
        brightMagenta: '#d678dd',
        brightCyan: '#76c6d2',
        brightWhite: '#ffffff',
      },
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      bellStyle: 'none',
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Initial fit
    setTimeout(() => {
      fitAddon.fit()
      terminalService.resize(id, term.cols, term.rows)
    }, 100)

    // Send user input to PTY
    term.onData((data) => {
      terminalService.input(id, data)
    })

    // Create PTY session
    try {
      await terminalService.create(id, cwd)
    } catch (err) {
      term.writeln(`\r\n\x1b[31mFailed to start terminal: ${err.message}\x1b[0m\r\n`)
    }
  }, [id, cwd])

  // Register global data/exit handlers
  useEffect(() => {
    terminalService.onData((termId, data) => {
      if (termId === id && termRef.current) {
        termRef.current.write(data)
      }
    })
    terminalService.onExit((termId, code) => {
      if (termId === id && termRef.current) {
        termRef.current.writeln(`\r\n\x1b[33m[Process exited with code ${code}]\x1b[0m`)
      }
    })
  }, [id])

  // Initialize when container mounts
  useEffect(() => {
    initTerminal()
    return () => {
      if (termRef.current) {
        termRef.current.dispose()
        termRef.current = null
        isInitialized.current = false
      }
      terminalService.kill(id)
    }
  }, [initTerminal, id])

  // Re-fit when becoming active or on resize
  useEffect(() => {
    if (isActive && fitAddonRef.current && termRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current.fit()
          terminalService.resize(id, termRef.current.cols, termRef.current.rows)
        } catch {}
      }, 50)
    }
  }, [isActive, id])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isActive && fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit()
          terminalService.resize(id, termRef.current.cols, termRef.current.rows)
        } catch {}
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isActive, id])

  return (
    <div
      className={`terminal-pane ${isActive ? 'active' : ''}`}
      onClick={() => termRef.current?.focus()}
    >
      <div
        ref={containerRef}
        className="terminal-container selectable"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
