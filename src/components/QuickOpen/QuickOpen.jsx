import React, { useState, useEffect, useRef, useCallback } from 'react'
import { relativePath } from '../../utils/pathUtils'
import './QuickOpen.css'

function fuzzyMatch(str, query) {
  if (!query) return { match: true, score: 0, ranges: [] }
  const s = str.toLowerCase()
  const q = query.toLowerCase()
  let si = 0, qi = 0
  const ranges = []
  let start = -1
  while (si < s.length && qi < q.length) {
    if (s[si] === q[qi]) {
      if (start === -1) start = si
      qi++
      if (qi === q.length) {
        ranges.push([start, si])
        start = -1
      }
    } else if (start !== -1) {
      ranges.push([start, si - 1])
      start = -1
    }
    si++
  }
  if (qi < q.length) return { match: false }
  return { match: true, score: ranges.length, ranges }
}

function flattenTree(nodes, root) {
  const result = []
  function walk(nodes) {
    for (const node of nodes) {
      if (!node.isDir) result.push(node)
      if (node.children) walk(node.children)
    }
  }
  walk(nodes)
  return result
}

function HighlightedText({ text, query }) {
  if (!query) return <span>{text}</span>
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const parts = []
  let last = 0
  let idx = t.indexOf(q, 0)
  while (idx !== -1) {
    if (idx > last) parts.push(<span key={last}>{text.slice(last, idx)}</span>)
    parts.push(<mark key={idx}>{text.slice(idx, idx + q.length)}</mark>)
    last = idx + q.length
    idx = t.indexOf(q, last)
  }
  if (last < text.length) parts.push(<span key={last}>{text.slice(last)}</span>)
  return <>{parts}</>
}

export default function QuickOpen({ isOpen, projectRoot, fileTree, onOpen, onClose }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)

  // Flatten file tree into a list
  const allFiles = React.useMemo(() => {
    if (!fileTree) return []
    return flattenTree(fileTree, projectRoot)
  }, [fileTree, projectRoot])

  // Filter files by query
  useEffect(() => {
    if (!query.trim()) {
      setResults(allFiles.slice(0, 50))
      setSelectedIdx(0)
      return
    }
    const q = query.toLowerCase()
    const filtered = allFiles
      .filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      .slice(0, 50)
    setResults(filtered)
    setSelectedIdx(0)
  }, [query, allFiles])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIdx]) {
        onOpen(results[selectedIdx])
        onClose()
      }
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [results, selectedIdx, onOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="quickopen-overlay" onClick={onClose}>
      <div className="quickopen-modal fade-in" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Quick Open">
        <div className="quickopen-input-wrap">
          <span className="quickopen-icon">🔍</span>
          <input
            ref={inputRef}
            className="quickopen-input selectable"
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search files"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="quickopen-esc">Esc</kbd>
        </div>

        <div className="quickopen-results" role="listbox">
          {results.length === 0 && query && (
            <div className="quickopen-empty">No files found for "{query}"</div>
          )}
          {results.map((file, idx) => {
            const rel = projectRoot ? relativePath(projectRoot, file.path) : file.path
            return (
              <div
                key={file.path}
                className={`quickopen-item ${idx === selectedIdx ? 'selected' : ''}`}
                onClick={() => { onOpen(file); onClose() }}
                role="option"
                aria-selected={idx === selectedIdx}
              >
                <span className="quickopen-file-name">
                  <HighlightedText text={file.name} query={query} />
                </span>
                <span className="quickopen-file-path truncate">{rel}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
