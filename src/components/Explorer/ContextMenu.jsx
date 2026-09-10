import React, { useEffect, useRef } from 'react'
import './ContextMenu.css'

const MENU_ITEMS_FILE = [
  { id: 'open', label: 'Open', icon: '📂' },
  { id: 'rename', label: 'Rename', icon: '✏️' },
  { id: 'delete', label: 'Delete', icon: '🗑️', danger: true },
  { type: 'separator' },
  { id: 'copy-path', label: 'Copy Path', icon: '📋' },
  { type: 'separator' },
  { id: 'new-file', label: 'New File', icon: '📄' },
  { id: 'new-folder', label: 'New Folder', icon: '📁' },
]

const MENU_ITEMS_DIR = [
  { id: 'new-file', label: 'New File', icon: '📄' },
  { id: 'new-folder', label: 'New Folder', icon: '📁' },
  { type: 'separator' },
  { id: 'rename', label: 'Rename', icon: '✏️' },
  { id: 'delete', label: 'Delete', icon: '🗑️', danger: true },
  { type: 'separator' },
  { id: 'copy-path', label: 'Copy Path', icon: '📋' },
  { id: 'refresh', label: 'Refresh', icon: '🔄' },
]

export default function ContextMenu({ x, y, node, onAction, onClose }) {
  const menuRef = useRef(null)
  const items = node?.isDir ? MENU_ITEMS_DIR : MENU_ITEMS_FILE

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose])

  // Adjust position if menu goes off-screen
  const style = { top: y, left: x }
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect()
    if (x + rect.width > window.innerWidth) style.left = x - rect.width
    if (y + rect.height > window.innerHeight) style.top = y - rect.height
  }

  return (
    <div
      className="context-menu fade-in"
      style={style}
      ref={menuRef}
      role="menu"
      aria-label="File context menu"
    >
      {items.map((item, idx) => {
        if (item.type === 'separator') {
          return <div key={`sep-${idx}`} className="context-separator" role="separator" />
        }
        return (
          <button
            key={item.id}
            className={`context-item ${item.danger ? 'danger' : ''}`}
            onClick={() => { onAction(item.id, node); onClose() }}
            role="menuitem"
          >
            <span className="context-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
