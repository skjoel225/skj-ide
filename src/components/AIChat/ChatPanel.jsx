import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import AgentMessage from './AgentMessage';
import PermissionDialog from './PermissionDialog';
import ChatInput from './ChatInput';
import { contextManager } from '../../services/contextManager';
import './ChatPanel.css';

export default function ChatPanel({ projectName, projectRoot, fileTree, activeTab, tabs }) {
  const [messages, setMessages] = useState([]);
  const [mode, setMode] = useState('agent'); // 'chat' or 'agent'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [agentStatus, setAgentStatus] = useState(null);
  const [permissionRequest, setPermissionRequest] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, agentStatus]);

  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.ai) return;

    window.electronAPI.ai.onAgentStatus((status) => {
      setAgentStatus(status);
    });

    window.electronAPI.ai.onRequestPermission((req) => {
      setPermissionRequest(req);
    });

    return () => {
      window.electronAPI.ai.removeAllListeners();
    };
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setError(null);
    setAgentStatus(null);
  };

  const handlePermissionRespond = (allowed) => {
    if (permissionRequest) {
      window.electronAPI.ai.sendPermissionResponse(permissionRequest.id, allowed);
      setPermissionRequest(null);
    }
  };

  const handleSendMessage = async (text) => {
    setError(null);
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build system prompt with current context
      const systemPrompt = contextManager.buildSystemPrompt(projectName, fileTree, activeTab, tabs);
      
      const messagesToSend = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMessage
      ];

      let response;
      if (mode === 'agent') {
        response = await window.electronAPI.ai.runAgent(messagesToSend, projectRoot || projectName);
      } else {
        response = await window.electronAPI.ai.sendMessage(messagesToSend);
      }

      if (!response.success) {
        throw new Error(response.error);
      }

      if (mode === 'agent') {
        setMessages(response.messages); // Update with full history including tool calls
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: response.data.content }]);
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
      setAgentStatus(null);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-mode-toggle">
          <button 
            className={`mode-btn ${mode === 'chat' ? 'active' : ''}`}
            onClick={() => setMode('chat')}
          >Chat</button>
          <button 
            className={`mode-btn ${mode === 'agent' ? 'active' : ''}`}
            onClick={() => setMode('agent')}
          >Agent</button>
        </div>
        <button className="chat-new-btn" onClick={handleNewChat} title="New Chat">+</button>
      </div>
      
      <div className="chat-context-info">
        {activeTab ? (
          <span className="context-item truncate">📄 {activeTab.split('/').pop()}</span>
        ) : (
          <span className="context-item">No active file</span>
        )}
      </div>

      <div className="chat-messages selectable">
        {messages.length === 0 && (
          <div className="chat-empty">
            Posez une question sur votre projet pour commencer.
          </div>
        )}
        
        {messages.map((msg, i) => {
          if (mode === 'agent') {
            return <AgentMessage key={i} message={msg} agentStatus={agentStatus} />;
          }
          return <ChatMessage key={i} message={msg} />;
        })}
        
        {isLoading && (
          <div className="chat-loading">
            {mode === 'agent' && agentStatus 
              ? `Agent is ${agentStatus.status.replace('_', ' ')}...`
              : 'DeepSeek is thinking...'}
          </div>
        )}
        
        {error && (
          <div className="chat-error-box">{error}</div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
      
      <PermissionDialog request={permissionRequest} onRespond={handlePermissionRespond} />
    </div>
  );
}
