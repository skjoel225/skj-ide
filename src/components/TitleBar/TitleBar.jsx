import React, { useState, useEffect, useRef } from 'react'
import AudioPanel from '../Collaboration/AudioPanel'
import './TitleBar.css'

const api = window.electronAPI

export default function TitleBar({ 
  projectName, 
  onNewFile, 
  onOpenFile, 
  onOpenFolder, 
  onSave, 
  onSaveAs,
  onSaveAll,
  recentProjects = [],
  autoSave,
  onToggleAutoSave,
  onOpenSettings,
  theme,
  onThemeChange,
  onCollabCreate,
  onCollabJoin,
  isHost,
  onCollabPermissions
}) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [collabMenuOpen, setCollabMenuOpen] = useState(false)
  const [recentOpen, setRecentOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    api.window.onMaximized((val) => setIsMaximized(val))
    
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setCollabMenuOpen(false)
        setRecentOpen(false)
        setThemeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="titlebar" data-tauri-drag-region>
      {/* Left: Logo + App name + Menu */}
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text gradient-text">SKJ IDE</span>
        </div>
        
        {/* Menu Bar */}
        <div className="menubar" ref={menuRef}>
          <div 
            className={`menubar-item ${menuOpen ? 'active' : ''}`}
            onClick={() => { setMenuOpen(!menuOpen); setCollabMenuOpen(false); }}
          >
            File
          </div>
          <div 
            className={`menubar-item ${collabMenuOpen ? 'active' : ''}`}
            onClick={() => { setCollabMenuOpen(!collabMenuOpen); setMenuOpen(false); }}
          >
            Collaborate
          </div>
          
          {menuOpen && (
            <div className="menu-dropdown">
              <div className="menu-entry" onClick={() => { onNewFile(); setMenuOpen(false); }}>
                <span>New File...</span>
                <span className="menu-shortcut">Ctrl+N</span>
              </div>
              <div className="menu-entry" onClick={() => { api.window.new(); setMenuOpen(false); }}>
                <span>New Window</span>
                <span className="menu-shortcut">Ctrl+Shift+N</span>
              </div>
              <div className="menu-divider"></div>
              <div className="menu-entry" onClick={() => { onOpenFile(); setMenuOpen(false); }}>
                <span>Open File...</span>
                <span className="menu-shortcut">Ctrl+O</span>
              </div>
              <div className="menu-entry" onClick={() => { onOpenFolder(); setMenuOpen(false); }}>
                <span>Open Folder...</span>
                <span className="menu-shortcut">Ctrl+K Ctrl+O</span>
              </div>
              <div 
                className="menu-entry has-submenu" 
                onMouseEnter={() => setRecentOpen(true)}
                onMouseLeave={() => setRecentOpen(false)}
              >
                <span>Open Recent</span>
                <span className="menu-shortcut">›</span>
                {recentOpen && (
                  <div className="submenu-dropdown">
                    {recentProjects.length === 0 ? (
                      <div className="menu-entry" style={{ color: '#aaa', cursor: 'default' }}>
                        <span>No recent projects</span>
                      </div>
                    ) : (
                      recentProjects.map((p, i) => (
                        <div key={i} className="menu-entry" onClick={() => { onOpenFolder(p.path); setMenuOpen(false); setRecentOpen(false); }}>
                          <span>{p.name}</span>
                          <span className="menu-shortcut" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.path}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="menu-divider"></div>
              <div className="menu-entry" onClick={() => { onSave(); setMenuOpen(false); }}>
                <span>Save</span>
                <span className="menu-shortcut">Ctrl+S</span>
              </div>
              <div className="menu-entry" onClick={() => { onSaveAs(); setMenuOpen(false); }}>
                <span>Save As...</span>
                <span className="menu-shortcut">Ctrl+Shift+S</span>
              </div>
              <div className="menu-entry" onClick={() => { onSaveAll(); setMenuOpen(false); }}>
                <span>Save All</span>
                <span className="menu-shortcut">Ctrl+K S</span>
              </div>
              <div className="menu-divider"></div>
              <div className="menu-entry" onClick={() => { onToggleAutoSave(); setMenuOpen(false); }}>
                <span>Auto Save</span>
                <span className="menu-shortcut">{autoSave ? '✓' : ''}</span>
              </div>
              <div 
                className="menu-entry has-submenu" 
                onMouseEnter={() => setThemeOpen(true)}
                onMouseLeave={() => setThemeOpen(false)}
              >
                <span>Theme ({theme})</span>
                <span className="menu-shortcut">›</span>
                {themeOpen && (
                  <div className="submenu-dropdown">
                    <div className="menu-entry" onClick={() => { onThemeChange('dark'); setMenuOpen(false); setThemeOpen(false); }}>
                      <span>Dark</span>
                      <span className="menu-shortcut">{theme === 'dark' ? '✓' : ''}</span>
                    </div>
                    <div className="menu-entry" onClick={() => { onThemeChange('light'); setMenuOpen(false); setThemeOpen(false); }}>
                      <span>Light</span>
                      <span className="menu-shortcut">{theme === 'light' ? '✓' : ''}</span>
                    </div>
                    <div className="menu-entry" onClick={() => { onThemeChange('synthwave'); setMenuOpen(false); setThemeOpen(false); }}>
                      <span>Synthwave</span>
                      <span className="menu-shortcut">{theme === 'synthwave' ? '✓' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="menu-entry" onClick={() => { onOpenSettings(); setMenuOpen(false); }}>
                <span>Preferences</span>
                <span className="menu-shortcut">›</span>
              </div>
              <div className="menu-divider"></div>
              <div className="menu-entry" onClick={() => { api.window.close(); setMenuOpen(false); }}>
                <span>Exit</span>
                <span className="menu-shortcut"></span>
              </div>
            </div>
          )}

          {collabMenuOpen && (
            <div className="menu-dropdown" style={{ left: '50px' }}>
              <div className="menu-entry" onClick={() => { onCollabCreate(); setCollabMenuOpen(false); }}>
                <span>Create Session...</span>
              </div>
              <div className="menu-entry" onClick={() => { onCollabJoin(); setCollabMenuOpen(false); }}>
                <span>Join Session...</span>
              </div>
              {isHost && (
                <>
                  <div className="menu-divider"></div>
                  <div className="menu-entry" onClick={() => { onCollabPermissions(); setCollabMenuOpen(false); }}>
                    <span>Manage Permissions...</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {projectName && (
          <>
            <span className="titlebar-sep">—</span>
            <span className="titlebar-project">{projectName}</span>
          </>
        )}
      </div>

      {/* Center: drag region */}
      <div className="titlebar-drag" />

      {/* Right: Audio Panel + Window controls */}
      <AudioPanel />
      
      <div className="titlebar-controls">
        <button
          className="titlebar-btn btn-minimize"
          onClick={() => api.window.minimize()}
          title="Minimize"
          aria-label="Minimize window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </button>
        <button
          className="titlebar-btn btn-maximize"
          onClick={() => api.window.maximize()}
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M2 0H10V8H8V2H0V0H2Z" fill="currentColor" opacity="0.6" />
              <rect x="0" y="2" width="8" height="8" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
            </svg>
          )}
        </button>
        <button
          className="titlebar-btn btn-close"
          onClick={() => api.window.close()}
          title="Close"
          aria-label="Close window"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
