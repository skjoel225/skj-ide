import React, { useState, useRef, useEffect } from 'react';
import './ChatPanel.css';

export default function ChatInput({ onSend, isLoading }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        className="chat-textarea selectable"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Posez une question sur votre projet..."
        disabled={isLoading}
        rows={1}
      />
      <button 
        className="chat-send-btn" 
        onClick={handleSend} 
        disabled={!input.trim() || isLoading}
      >
        ➤
      </button>
    </div>
  );
}
