import React, { useRef, useMemo } from 'react'
import { basename } from '../../utils/pathUtils'
import { detectLanguage } from '../../utils/languageDetector'
import { actionRegistry } from '../../services/actionRegistry'
import './TabBar.css'

export default function TabBar({ tabs, activeTab, onSelect, onClose }) {
  const scrollRef = useRef(null)

  const handleWheel = (e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  // Determine actions based on active tab language
  const activeActions = useMemo(() => {
    if (!activeTab) return [];
    
    // Check if it's an extension or normal file
    if (activeTab.startsWith('extension:')) return [];

    const langId = detectLanguage(activeTab);
    return actionRegistry.getActionsForMenu('editor/title', { resourceLangId: langId });
  }, [activeTab]);

  const actionContext = { filePath: activeTab };

  return (
    <div className="tabbar" role="tablist" aria-label="Open files">
      <div className="tabbar-scroll" ref={scrollRef} onWheel={handleWheel}>
        {tabs.map((tab) => {
          const name = tab.name || basename(tab.path)
          const isActive = tab.path === activeTab
          return (
            <div
              key={tab.path}
              className={`tab ${isActive ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab.path)}
              title={tab.path}
            >
              <span className="tab-name truncate">{name}</span>
              {tab.isDirty && (
                <span className="tab-dirty-dot" title="Unsaved changes" aria-label="Modified" />
              )}
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onClose(tab.path) }}
                title="Close tab"
                aria-label={`Close ${name}`}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
      <div className="tabbar-actions">
        {activeActions.map(action => (
          <button
            key={action.command}
            className="editor-action-btn"
            title={action.title}
            onClick={() => actionRegistry.executeCommand(action.command, actionContext)}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
