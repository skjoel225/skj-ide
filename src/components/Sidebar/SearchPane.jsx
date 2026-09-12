import React, { useState, useEffect } from 'react';
import './SearchPane.css';

const api = window.electronAPI;

export default function SearchPane({ projectRoot, onOpenFile }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim() || !projectRoot) {
      setResults([]);
      setError(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const res = await api.fs.search(projectRoot, query);
        setResults(res || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsSearching(false);
      }
    }, 400); // Debounce search

    return () => clearTimeout(delayDebounceFn);
  }, [query, projectRoot]);

  // Group results by file path
  const groupedResults = results.reduce((acc, curr) => {
    if (!acc[curr.path]) acc[curr.path] = [];
    acc[curr.path].push(curr);
    return acc;
  }, {});

  const getRelativePath = (fullPath) => {
    if (!projectRoot) return fullPath;
    if (fullPath.startsWith(projectRoot)) {
      let rel = fullPath.substring(projectRoot.length);
      if (rel.startsWith('/') || rel.startsWith('\\')) rel = rel.substring(1);
      return rel;
    }
    return fullPath;
  };

  return (
    <div className="search-pane">
      <div className="search-pane-header">
        <span>SEARCH</span>
      </div>
      <div className="search-pane-body">
        <div className="search-form">
          <input 
            type="text" 
            placeholder="Search in files..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
            disabled={!projectRoot}
            title={!projectRoot ? 'Open a folder first' : 'Type to search'}
          />
        </div>

        <div className="search-results">
          {isSearching && <div className="search-status">Searching...</div>}
          {error && <div className="search-error">{error}</div>}
          
          {!isSearching && !error && query.trim() && Object.keys(groupedResults).length === 0 && (
            <div className="search-status">No results found.</div>
          )}

          {!isSearching && Object.keys(groupedResults).map(filePath => (
            <div key={filePath} className="search-file-group">
              <div 
                className="search-file-path"
                onClick={() => onOpenFile(filePath)}
                title={filePath}
              >
                📄 {getRelativePath(filePath)}
              </div>
              <div className="search-matches">
                {groupedResults[filePath].map((match, i) => (
                  <div 
                    key={i} 
                    className="search-match"
                    onClick={() => onOpenFile(filePath)} // We can later pass line number to openFile!
                    title={`Line ${match.line}`}
                  >
                    <span className="search-match-line">{match.line}</span>
                    <span className="search-match-content">{match.content}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
