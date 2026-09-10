import React from 'react';
import Markdown from 'react-markdown';
import './ChatPanel.css';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-ai'}`}>
      <div className="chat-message-header">
        <span className="chat-message-role">{isUser ? 'USER' : 'DEEPSEEK'}</span>
      </div>
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
