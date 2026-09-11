import React, { useState, useCallback, useEffect, useRef } from 'react'
import TitleBar from './components/TitleBar/TitleBar'
import FileTree from './components/Explorer/FileTree'
import ContextMenu from './components/Explorer/ContextMenu'
import TabBar from './components/Editor/TabBar'
import EditorPane from './components/Editor/EditorPane'
import TerminalTabs from './components/Terminal/TerminalTabs'
import StatusBar from './components/StatusBar/StatusBar'
import QuickOpen from './components/QuickOpen/QuickOpen'
import AgentTabsView from './components/AIOperation/AgentTabsView'
import MigrationModal from './components/Migration/MigrationModal'
import MigrationSettings from './components/Settings/MigrationSettings'
import CollaborationModal from './components/Collaboration/CollaborationModal'
import PermissionsModal from './components/Collaboration/PermissionsModal'
import { fileService } from './services/fileService'
import { projectService } from './services/projectService'
import { collaborationService } from './services/collaborationService'
import { detectLanguage } from './utils/languageDetector'
import { basename, dirname, joinPath, validateFilename } from './utils/pathUtils'
import './App.css'

const api = window.electronAPI

export default function App() {
  // ─── Project State ──────────────────────────────────────────────
  const [projectRoot, setProjectRoot] = useState(null)
  const [projectName, setProjectName] = useState('')
  const [fileTree, setFileTree] = useState([])
  const [recentProjects, setRecentProjects] = useState([])

  useEffect(() => {
    const savedRecents = localStorage.getItem('skj.recentProjects')
    if (savedRecents) {
      try { setRecentProjects(JSON.parse(savedRecents)) } catch {}
    }
  }, [])

  // ─── Editor State ───────────────────────────────────────────────
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [cursorPosition, setCursorPosition] = useState(null)

  // ─── UI State ───────────────────────────────────────────────────
  const [selectedPath, setSelectedPath] = useState(null)
  const [contextMenu, setContextMenu] = useState(null) // { x, y, node }
  const [isTerminalOpen, setIsTerminalOpen] = useState(true)
  const [isQuickOpenVisible, setIsQuickOpenVisible] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [showMigrationModal, setShowMigrationModal] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [chatWidth, setChatWidth] = useState(400)
  const [isDraggingChat, setIsDraggingChat] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [theme, setTheme] = useState(() => localStorage.getItem('skj.theme') || 'dark')
  
  // ─── Collaboration State ─────────────────────────────────────────
  const [collabModal, setCollabModal] = useState(null) // { type: 'create-prompt' | 'join', code?: string }
  const [collabStatus, setCollabStatus] = useState('idle')
  const [showPermissions, setShowPermissions] = useState(false)

  useEffect(() => {
    const unsubStatus = collaborationService.onChange('status', (status) => setCollabStatus(status))
    const unsubTree = collaborationService.onChange('file-tree', (tree) => setFileTree(tree))
    const unsubEdit = collaborationService.onChange('file-edit', (data) => {
      // If a guest/host edits a file, and we have it open, update its content
      setTabs(prev => prev.map(t => {
        if (t.path !== data.path) return t;
        return { ...t, content: data.content, isDirty: data.content !== t.originalContent }
      }))
    })

    return () => {
      unsubStatus()
      unsubTree()
      unsubEdit()
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? '' : theme)
    localStorage.setItem('skj.theme', theme)
  }, [theme])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ─── Dialog/Modal State ─────────────────────────────────────────
  const [dialog, setDialog] = useState(null) // { type, node, defaultValue, onConfirm }
  const [dialogValue, setDialogValue] = useState('')
  const [dialogError, setDialogError] = useState('')
  const dialogInputRef = useRef(null)

  // ─────────────────────────────────────────────────────────────────
  // Project: Open Folder
  // ─────────────────────────────────────────────────────────────────
  const handleOpenFolder = useCallback(async (pathParam) => {
    const folderPath = typeof pathParam === 'string' ? pathParam : await api.dialog.openFolder()
    if (!folderPath) return
    try {
      const tree = await fileService.readDir(folderPath)
      projectService.setRoot(folderPath)
      setProjectRoot(folderPath)
      const pName = basename(folderPath)
      setProjectName(pName)
      setFileTree(tree)
      
      // Update recent projects
      setRecentProjects(prev => {
        const newRecents = [{ path: folderPath, name: pName }, ...prev.filter(p => p.path !== folderPath)].slice(0, 10)
        localStorage.setItem('skj.recentProjects', JSON.stringify(newRecents))
        return newRecents
      })

      // Watch for changes
      await fileService.watchDir(folderPath)
    } catch (err) {
      showError(`Cannot open folder: ${err.message}`)
    }
  }, [])

  // Watch file changes and refresh tree
  useEffect(() => {
    fileService.onFileChange(async ({ type, path }) => {
      if (projectRoot) {
        try {
          const tree = await fileService.readDir(projectRoot)
          setFileTree(tree)
          if (collaborationService.isHost) {
            collaborationService.broadcastFileTree()
          }
        } catch {}
      }
    })
  }, [projectRoot])

  // ─────────────────────────────────────────────────────────────────
  // Editor: Open File
  // ─────────────────────────────────────────────────────────────────
  const openFile = useCallback(async (node) => {
    if (!node || node.isDir) return
    // Already open? Just switch
    const existing = tabs.find(t => t.path === node.path)
    if (existing) {
      setActiveTab(node.path)
      return
    }
    try {
      const { content } = await fileService.readFile(node.path)
      const newTab = {
        path: node.path,
        content,
        originalContent: content,
        isDirty: false,
      }
      setTabs(prev => [...prev, newTab])
      setActiveTab(node.path)
    } catch (err) {
      showError(`Cannot open file: ${err.message}`)
    }
  }, [tabs])

  const handleEditorChange = useCallback((path, newContent) => {
    setTabs(prev => prev.map(t => {
      if (t.path !== path) return t
      return { ...t, content: newContent, isDirty: newContent !== t.originalContent }
    }))
    
    // Sync with other collaborators if active
    if (collaborationService.roomId) {
      collaborationService.syncFileEdit(path, newContent)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // Editor: Save (Ctrl+S)
  // ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (path) => {
    const filePath = path || activeTab
    if (!filePath) return
    const tab = tabs.find(t => t.path === filePath)
    if (!tab) return
    try {
      await fileService.writeFile(filePath, tab.content)
      setTabs(prev => prev.map(t =>
        t.path === filePath
          ? { ...t, isDirty: false, originalContent: t.content }
          : t
      ))
    } catch (err) {
      showError(`Cannot save file:\n\n${err.message}`)
    }
  }, [activeTab, tabs])

  const handleSaveAll = useCallback(async () => {
    const dirtyTabs = tabs.filter(t => t.isDirty)
    for (const tab of dirtyTabs) {
      try {
        await fileService.writeFile(tab.path, tab.content)
      } catch (err) {
        showError(`Cannot save ${basename(tab.path)}: ${err.message}`)
      }
    }
    setTabs(prev => prev.map(t => ({ ...t, isDirty: false, originalContent: t.content })))
  }, [tabs])

  // Auto Save Effect
  useEffect(() => {
    if (!autoSave) return
    const dirtyTabs = tabs.filter(t => t.isDirty)
    if (dirtyTabs.length === 0) return

    const timer = setTimeout(() => {
      handleSaveAll()
    }, 1500) // Auto save after 1.5s of no typing

    return () => clearTimeout(timer)
  }, [tabs, autoSave, handleSaveAll])

  // ─────────────────────────────────────────────────────────────────
  // Editor: Save As
  // ─────────────────────────────────────────────────────────────────
  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return
    const tab = tabs.find(t => t.path === activeTab)
    if (!tab) return
    const newPath = await api.dialog.saveFile(activeTab)
    if (!newPath) return
    try {
      await fileService.writeFile(newPath, tab.content)
      // Update the tab path
      setTabs(prev => prev.map(t =>
        t.path === activeTab
          ? { ...t, path: newPath, isDirty: false, originalContent: t.content }
          : t
      ))
      setActiveTab(newPath)
      // Refresh file tree
      if (projectRoot) {
        const tree = await fileService.readDir(projectRoot)
        setFileTree(tree)
      }
    } catch (err) {
      showError(`Cannot save file: ${err.message}`)
    }
  }, [activeTab, tabs, projectRoot])

  // ─────────────────────────────────────────────────────────────────
  // Editor: Close Tab
  // ─────────────────────────────────────────────────────────────────
  const handleCloseTab = useCallback((path) => {
    const tab = tabs.find(t => t.path === path)
    if (tab?.isDirty) {
      const confirmed = window.confirm(
        `"${basename(path)}" has unsaved changes. Close without saving?`
      )
      if (!confirmed) return
    }
    setTabs(prev => {
      const remaining = prev.filter(t => t.path !== path)
      if (activeTab === path) {
        const idx = prev.findIndex(t => t.path === path)
        const next = remaining[Math.min(idx, remaining.length - 1)]
        setActiveTab(next?.path || null)
      }
      return remaining
    })
  }, [tabs, activeTab])

  // ─────────────────────────────────────────────────────────────────
  // Explorer: Context Menu Actions
  // ─────────────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e, node) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }, [])

  const handleContextAction = useCallback(async (action, node) => {
    switch (action) {
      case 'open':
        openFile(node)
        break
      case 'rename':
        openDialog('rename', node, basename(node.path))
        break
      case 'delete':
        openDialog('delete', node)
        break
      case 'new-file':
        openDialog('new-file', node)
        break
      case 'new-folder':
        openDialog('new-folder', node)
        break
      case 'copy-path':
        navigator.clipboard.writeText(node.path)
        break
      case 'refresh':
        await refreshTree()
        break
    }
  }, [openFile])

  const refreshTree = async () => {
    if (!projectRoot) return
    try {
      const tree = await fileService.readDir(projectRoot)
      setFileTree(tree)
    } catch (err) {
      showError(`Cannot refresh: ${err.message}`)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Dialog system
  // ─────────────────────────────────────────────────────────────────
  const openDialog = (type, node, defaultValue = '') => {
    setDialog({ type, node })
    setDialogValue(defaultValue)
    setDialogError('')
    setTimeout(() => {
      dialogInputRef.current?.focus()
      dialogInputRef.current?.select()
    }, 50)
  }

  const closeDialog = () => {
    setDialog(null)
    setDialogValue('')
    setDialogError('')
  }

  const handleDialogConfirm = async () => {
    if (!dialog) return
    const { type, node } = dialog

    if (type === 'delete') {
      try {
        await fileService.delete(node.path, node.isDir)
        // Close tabs if file was open
        if (!node.isDir) {
          setTabs(prev => prev.filter(t => t.path !== node.path))
          if (activeTab === node.path) setActiveTab(null)
        }
        await refreshTree()
        closeDialog()
      } catch (err) {
        setDialogError(err.message)
      }
      return
    }

    const validation = validateFilename(dialogValue)
    if (!validation.valid) {
      setDialogError(validation.error)
      return
    }

    try {
      if (type === 'rename') {
        const dir = dirname(node.path)
        const newPath = dir + '/' + dialogValue
        await fileService.rename(node.path, newPath)
        // Update tab if file is open
        setTabs(prev => prev.map(t =>
          t.path === node.path ? { ...t, path: newPath } : t
        ))
        if (activeTab === node.path) setActiveTab(newPath)

      } else if (type === 'new-file') {
        const parentDir = node.isDir ? node.path : dirname(node.path)
        const newPath = parentDir + '/' + dialogValue
        await fileService.createFile(newPath)
        await openFile({ path: newPath, isDir: false })

      } else if (type === 'new-folder') {
        const parentDir = node.isDir ? node.path : dirname(node.path)
        const newPath = parentDir + '/' + dialogValue
        await fileService.createFolder(newPath)
      }

      await refreshTree()
      closeDialog()
    } catch (err) {
      setDialogError(err.message)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Keyboard Shortcuts
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let ctrlKPressed = false
    let ctrlKTimeout = null

    const handleKeyDown = (e) => {
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 's' && !e.shiftKey && !ctrlKPressed) {
        e.preventDefault()
        handleSave()
      } else if (ctrl && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        handleSaveAs()
      } else if (ctrl && e.key === 'p') {
        e.preventDefault()
        setIsQuickOpenVisible(v => !v)
      } else if (ctrl && (e.key === '`' || e.key === 'j')) {
        e.preventDefault()
        setIsTerminalOpen(v => !v)
      } else if (ctrl && e.key === 'w') {
        e.preventDefault()
        if (activeTab) handleCloseTab(activeTab)
      } else if (ctrl && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        api.window.new()
      } else if (ctrl && e.key === 'k') {
        ctrlKPressed = true
        if (ctrlKTimeout) clearTimeout(ctrlKTimeout)
        ctrlKTimeout = setTimeout(() => { ctrlKPressed = false }, 1000)
      } else if (ctrlKPressed && e.key === 's') {
        e.preventDefault()
        handleSaveAll()
        ctrlKPressed = false
        clearTimeout(ctrlKTimeout)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleSaveAs, handleSaveAll, activeTab, handleCloseTab])

  // ─────────────────────────────────────────────────────────────────
  // Sidebar resize drag
  // ─────────────────────────────────────────────────────────────────
  const handleSidebarResizeStart = (e) => {
    e.preventDefault()
    setIsDraggingSidebar(true)
    const startX = e.clientX
    const startWidth = sidebarWidth

    const onMove = (ev) => {
      const delta = ev.clientX - startX
      setSidebarWidth(Math.max(160, Math.min(600, startWidth + delta)))
    }
    const onUp = () => {
      setIsDraggingSidebar(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─────────────────────────────────────────────────────────────────
  // Chat resize drag
  // ─────────────────────────────────────────────────────────────────
  const handleChatResizeStart = (e) => {
    e.preventDefault()
    setIsDraggingChat(true)
    const startX = e.clientX
    const startWidth = chatWidth

    const onMove = (ev) => {
      const delta = startX - ev.clientX
      setChatWidth(Math.max(200, Math.min(600, startWidth + delta)))
    }
    const onUp = () => {
      setIsDraggingChat(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ─────────────────────────────────────────────────────────────────
  // Active file info for status bar
  // ─────────────────────────────────────────────────────────────────
  const activeTabData = tabs.find(t => t.path === activeTab)
  const activeLang = activeTab ? detectLanguage(activeTab) : null

  // ─────────────────────────────────────────────────────────────────
  // Collaboration
  // ─────────────────────────────────────────────────────────────────
  const handleCollabCreate = async (username) => {
    if (!projectRoot) {
      showError('Please open a folder first to share it.');
      return;
    }
    const code = await collaborationService.createRoom(projectRoot, username);
    if (code) {
      setCollabModal({ type: 'create-success', code });
    } else {
      showError('Failed to create collaboration session.');
    }
  }

  const handleCollabJoin = async (code, username) => {
    const success = await collaborationService.joinRoom(code, username);
    if (success) {
      setCollabModal(null);
      // Let the socket fetch the file tree automatically (via guest-receive-file-tree)
      // Note: we might need to ask the host for it right away
      collaborationService.requestFileTree();
    } else {
      showError('Failed to join room. Please check the code.');
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Error helper
  // ─────────────────────────────────────────────────────────────────
  function showError(msg) {
    alert(msg) // Will be replaced by a toast system later
  }

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      {/* Title Bar */}
      <TitleBar 
        projectName={projectName}
        onNewFile={() => openDialog('new-file', { path: projectRoot || '', isDir: true })}
        onOpenFile={async () => {
          const filePath = await api.dialog.openFile()
          if (filePath) await openFile({ path: filePath, isDir: false })
        }}
        onOpenFolder={handleOpenFolder}
        onSave={() => handleSave()}
        onSaveAs={handleSaveAs}
        onSaveAll={handleSaveAll}
        recentProjects={recentProjects}
        autoSave={autoSave}
        onToggleAutoSave={() => setAutoSave(!autoSave)}
        onOpenSettings={() => setShowSettings(true)}
        theme={theme}
        onThemeChange={setTheme}
        onCollabCreate={() => setCollabModal({ type: 'create-prompt' })}
        onCollabJoin={() => setCollabModal({ type: 'join' })}
        isHost={collaborationService.isHost}
        onCollabPermissions={() => setShowPermissions(true)}
      />

      {/* Main area */}
      <div className="app-body">
        {/* Sidebar */}
        <div className="sidebar" style={{ width: sidebarWidth }}>
          {/* Sidebar header */}
          <div className="sidebar-header">
            <span className="sidebar-title">EXPLORER</span>
            <div className="sidebar-actions">
              <button
                className="sidebar-action-btn"
                onClick={() => openDialog('new-file', { path: projectRoot || '', isDir: true })}
                title="New File"
                disabled={!projectRoot}
                aria-label="New file"
              >📄+</button>
              <button
                className="sidebar-action-btn"
                onClick={() => openDialog('new-folder', { path: projectRoot || '', isDir: true })}
                title="New Folder"
                disabled={!projectRoot}
                aria-label="New folder"
              >📁+</button>
              <button
                className="sidebar-action-btn"
                onClick={refreshTree}
                title="Refresh"
                disabled={!projectRoot}
                aria-label="Refresh explorer"
              >🔄</button>
            </div>
          </div>

          {/* Project name */}
          {(projectName || (collabStatus === 'joined')) && (
            <div className="sidebar-project-name">
              <span>📁</span>
              <span className="truncate">
                {collabStatus === 'joined' ? `REMOTE (${collaborationService.roomId})` : projectName.toUpperCase()}
              </span>
            </div>
          )}

          {/* Open Folder button */}
          {(!projectRoot && collabStatus !== 'joined') ? (
            <div className="sidebar-open-folder">
              <button
                className="btn-open-folder"
                onClick={handleOpenFolder}
                id="btn-open-folder"
              >
                Open Folder
              </button>
              <p className="sidebar-hint">Open a folder to start editing</p>
            </div>
          ) : (
            <FileTree
              tree={fileTree}
              selectedPath={selectedPath}
              onSelect={setSelectedPath}
              onOpen={openFile}
              onContextMenu={handleContextMenu}
              onRefresh={refreshTree}
            />
          )}
        </div>

        {/* Sidebar resize handle */}
        <div
          className={`sidebar-resize ${isDraggingSidebar ? 'dragging' : ''}`}
          onMouseDown={handleSidebarResizeStart}
          aria-label="Resize sidebar"
          role="separator"
        />

        {/* Editor area */}
        <div className="editor-area">
          {/* Tab bar */}
          {tabs.length > 0 && (
            <TabBar
              tabs={tabs}
              activeTab={activeTab}
              onSelect={setActiveTab}
              onClose={handleCloseTab}
            />
          )}

          {/* Monaco Editor */}
          <EditorPane
            activeTab={activeTab}
            tabs={tabs}
            onChange={handleEditorChange}
            onCursorChange={setCursorPosition}
            onSave={handleSave}
          />

          {/* Terminal */}
          <TerminalTabs
            cwd={projectRoot}
            isOpen={isTerminalOpen}
          />
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <>
            <div
              className={`chat-resize ${isDraggingChat ? 'dragging' : ''}`}
              onMouseDown={handleChatResizeStart}
              aria-label="Resize chat"
              role="separator"
            />
            <div className="chat-area" style={{ width: chatWidth }}>
              <AgentTabsView 
                projectName={projectName}
                projectRoot={projectRoot}
                fileTree={fileTree}
                activeTab={activeTab}
                tabs={tabs}
              />
            </div>
          </>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        activeFile={activeTab}
        cursorPosition={cursorPosition}
        language={activeLang}
        encoding="UTF-8"
        indentation="Spaces: 2"
        isOnline={isOnline}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Quick Open */}
      <QuickOpen
        isOpen={isQuickOpenVisible}
        projectRoot={projectRoot}
        fileTree={fileTree}
        onOpen={openFile}
        onClose={() => setIsQuickOpenVisible(false)}
      />

      {/* Dialog (rename / new file / new folder / delete) */}
      {dialog && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div
            className="dialog-modal fade-in"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={getDialogTitle(dialog.type)}
          >
            <h2 className="dialog-title">{getDialogTitle(dialog.type)}</h2>

            {dialog.type === 'delete' ? (
              <p className="dialog-message">
                Are you sure you want to delete:<br />
                <strong>{basename(dialog.node.path)}</strong>
                {dialog.node.isDir && <><br /><span className="dialog-warning">This will delete all contents.</span></>}
              </p>
            ) : (
              <div className="dialog-input-group">
                <input
                  ref={dialogInputRef}
                  className="dialog-input selectable"
                  type="text"
                  value={dialogValue}
                  onChange={e => { setDialogValue(e.target.value); setDialogError('') }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleDialogConfirm()
                    if (e.key === 'Escape') closeDialog()
                  }}
                  placeholder={dialog.type === 'rename' ? 'New name...' : 'Name...'}
                  aria-label="Input name"
                />
                {dialogError && <p className="dialog-error">{dialogError}</p>}
              </div>
            )}

            <div className="dialog-actions">
              <button className="dialog-btn btn-cancel" onClick={closeDialog}>Cancel</button>
              <button
                className={`dialog-btn ${dialog.type === 'delete' ? 'btn-delete' : 'btn-confirm'}`}
                onClick={handleDialogConfirm}
              >
                {dialog.type === 'delete' ? 'Delete' : dialog.type === 'rename' ? 'Rename' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMigrationModal && (
        <MigrationModal 
          projectRoot={projectRoot} 
          onClose={() => setShowMigrationModal(false)} 
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="dialog-overlay" onClick={() => setShowSettings(false)}>
          <div className="dialog-modal fade-in" style={{ width: '600px', maxWidth: '90vw', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Preferences</h2>
              <button className="btn-cancel" style={{ padding: '4px 8px' }} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <MigrationSettings projectRoot={projectRoot} />
            </div>
          </div>
        </div>
      )}

      {collabModal && (
        <CollaborationModal 
          type={collabModal.type}
          code={collabModal.code}
          onClose={() => setCollabModal(null)}
          onJoin={handleCollabJoin}
          onCreate={handleCollabCreate}
        />
      )}

      {/* Permissions Modal */}
      {showPermissions && (
        <PermissionsModal onClose={() => setShowPermissions(false)} />
      )}
    </div>
  )
}

function getDialogTitle(type) {
  const titles = {
    'rename': 'Rename',
    'delete': 'Delete',
    'new-file': 'New File',
    'new-folder': 'New Folder',
  }
  return titles[type] || ''
}
