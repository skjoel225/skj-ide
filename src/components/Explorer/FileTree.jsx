import React, { useState, useCallback, useRef } from 'react'
import { basename } from '../../utils/pathUtils'
import './FileTree.css'

// File icons based on extension
function getFileIcon(name, isDir, isOpen) {
  if (isDir) return isOpen ? '📂' : '📁'
  const ext = name.split('.').pop().toLowerCase()
  const icons = {
    js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    html: '🌐', css: '🎨', scss: '🎨', less: '🎨',
    json: '{}', md: '📝', txt: '📄',
    py: '🐍', rb: '💎', php: '🐘', go: '🔵', rs: '🦀',
    java: '☕', cs: '🔷', cpp: '⚙️', c: '⚙️',
    sh: '🐚', ps1: '🔷', bat: '⚙️',
    svg: '🖼️', png: '🖼️', jpg: '🖼️', gif: '🖼️', ico: '🖼️',
    pdf: '📕', zip: '📦', gitignore: '🔒', env: '🔒',
  }
  return icons[ext] || '📄'
}

// Single tree node (recursive)
function TreeNode({ node, depth, selectedPath, onSelect, onOpen, onContextMenu, expandedPaths, onToggle }) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const icon = getFileIcon(node.name, node.isDir, isExpanded)

  const handleClick = (e) => {
    e.stopPropagation()
    onSelect(node.path)
    if (node.isDir) onToggle(node.path)
  }

  const handleDblClick = (e) => {
    e.stopPropagation()
    if (!node.isDir) onOpen(node)
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect(node.path)
    onContextMenu(e, node)
  }

  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isSelected ? 'selected' : ''} ${node.isDir ? 'is-dir' : 'is-file'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDblClick}
        onContextMenu={handleContextMenu}
        title={node.path}
        role="treeitem"
        aria-expanded={node.isDir ? isExpanded : undefined}
        aria-selected={isSelected}
      >
        {/* Expand/collapse arrow for directories */}
        {node.isDir && (
          <span className={`tree-arrow ${isExpanded ? 'expanded' : ''}`}>
            ›
          </span>
        )}
        {!node.isDir && <span className="tree-arrow-spacer" />}

        <span className="tree-icon">{icon}</span>
        <span className="tree-name truncate">{node.name}</span>
      </div>

      {/* Children (if directory and expanded) */}
      {node.isDir && isExpanded && node.children && (
        <div className="tree-children">
          {node.children.length === 0 ? (
            <div className="tree-empty" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
              Empty folder
            </div>
          ) : (
            node.children.map(child => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onOpen={onOpen}
                onContextMenu={onContextMenu}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function FileTree({ tree, selectedPath, onSelect, onOpen, onContextMenu, onRefresh }) {
  const [expandedPaths, setExpandedPaths] = useState(new Set())

  const handleToggle = useCallback((path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  if (!tree || tree.length === 0) {
    return (
      <div className="filetree-empty">
        <div className="filetree-empty-icon">📂</div>
        <div className="filetree-empty-text">No files</div>
      </div>
    )
  }

  return (
    <div className="filetree" role="tree">
      {tree.map(node => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onOpen={onOpen}
          onContextMenu={onContextMenu}
          expandedPaths={expandedPaths}
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
