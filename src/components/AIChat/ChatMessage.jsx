import React from 'react';
import Markdown from 'react-markdown';
import './ChatPanel.css';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-ai'}`}>
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', opacity: 0.8 }}>
          <span style={{ color: 'var(--accent-color)', fontSize: '14px' }}>⬡</span>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>SKJ</span>
        </div>
      )}
      <div className="chat-message-content">
        {isUser ? (
          <div className="chat-text">{message.content}</div>
        ) : (
          <div className="chat-markdown"><Markdown>{message.content}</Markdown></div>
        )}
      </div>
    </div>
  );
}
