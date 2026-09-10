import React, { useRef } from 'react'
import { basename } from '../../utils/pathUtils'
import './TabBar.css'

export default function TabBar({ tabs, activeTab, onSelect, onClose }) {
  const scrollRef = useRef(null)

  const handleWheel = (e) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY
    }
  }

  return (
    <div className="tabbar" role="tablist" aria-label="Open files">
      <div className="tabbar-scroll" ref={scrollRef} onWheel={handleWheel}>
        {tabs.map((tab) => {
          const name = basename(tab.path)
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
    </div>
  )
}
