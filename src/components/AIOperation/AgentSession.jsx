import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from '../AIChat/ChatMessage';
import AgentMessage from '../AIChat/AgentMessage';
import PermissionDialog from '../AIChat/PermissionDialog';
import ChatInput from '../AIChat/ChatInput';
import { contextManager } from '../../services/contextManager';
import { collaborationService } from '../../services/collaborationService';
import '../AIChat/ChatPanel.css';

export default function AgentSession({ session, onUpdateSession, projectName, projectRoot, fileTree, activeTab, tabs }) {
  const { id: sessionId, name, messages } = session;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [agentStatus, setAgentStatus] = useState(null);
  const [permissionRequest, setPermissionRequest] = useState(null);
  const [streamingText, setStreamingText] = useState('');
  
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, agentStatus, streamingText]);

  useEffect(() => {
    const handleAgentStatus = (status) => {
      if (status.sessionId === sessionId || !status.sessionId) {
        setAgentStatus(status);
      }
    };

    const handlePermissionRequest = (req) => {
      setPermissionRequest(req);
    };

    const handleMessageChunk = (data) => {
      if (data.sessionId === sessionId) {
        setStreamingText(prev => prev + data.chunk);
      }
    };

    if (window.electronAPI && window.electronAPI.ai) {
      window.electronAPI.ai.onAgentStatus(handleAgentStatus);
      window.electronAPI.ai.onAgentMessageChunk(handleMessageChunk);
      window.electronAPI.ai.onRequestPermission(handlePermissionRequest);
    }

    // Collaboration Listeners
    const cleanupChunk = collaborationService.onChange('ai-chunk', handleMessageChunk);
    const cleanupStatus = collaborationService.onChange('ai-status', handleAgentStatus);
    const cleanupResponse = collaborationService.onChange('ai-response', (data) => {
      if (data.sessionId === sessionId) {
        onUpdateSession(sessionId, { messages: data.response.messages });
        setIsLoading(false);
        setAgentStatus(null);
        setStreamingText('');
      }
    });

    return () => {
      cleanupChunk();
      cleanupStatus();
      cleanupResponse();
    };
  }, [sessionId]);

  const handlePermissionRespond = (allowed) => {
    if (permissionRequest) {
      window.electronAPI.ai.sendPermissionResponse(permissionRequest.id, allowed);
      setPermissionRequest(null);
    }
  };

  const handleSendMessage = async (text) => {
    setError(null);
    const userMessage = { role: 'user', content: text };
    
    // Optimistic update
    onUpdateSession(sessionId, { messages: [...messages, userMessage] });
    setIsLoading(true);
    setStreamingText('');

    try {
      const systemPrompt = contextManager.buildSystemPrompt(projectName, fileTree, activeTab, tabs);
      
      const messagesToSend = [
        { role: 'system', content: systemPrompt },
        ...messages,
        userMessage
      ];

      if (collaborationService.roomId && !collaborationService.isHost) {
        // Guest mode: send request to Host
        collaborationService.sendAIRequest(messagesToSend, sessionId);
        // We will receive 'ai-response' eventually, don't set loading false here
      } else {
        // Host mode or Offline
        const response = await window.electronAPI.ai.runAgent(messagesToSend, projectRoot || projectName, sessionId);

        if (!response.success) {
          throw new Error(response.error);
        }

        onUpdateSession(sessionId, { messages: response.messages });
        setIsLoading(false);
        setAgentStatus(null);
        setStreamingText('');
      }
    } catch (err) {
      if (err.message === 'OFFLINE_ERROR' || (err.message && err.message.includes('OFFLINE_ERROR'))) {
        setError('Internet indisponible. Les fonctionnalités locales de SKJ IDE continuent de fonctionner. Les fonctions IA nécessitant DeepSeek sont temporairement indisponibles.');
      } else {
        setError(err.message || 'Une erreur est survenue.');
      }
      setIsLoading(false);
      setAgentStatus(null);
      setStreamingText('');
    }
  };

  return (
    <div className="chat-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="chat-context-info">
        <span className="context-item truncate">Agent: {name}</span>
        {activeTab && (
          <span className="context-item truncate">| 📄 {activeTab.split('/').pop()}</span>
        )}
      </div>

      <div className="chat-messages selectable" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {messages.length === 0 && (
          <div className="chat-empty">
            Envoyez une instruction à cet agent pour qu'il commence à travailler.
          </div>
        )}
        
        {messages.map((msg, i) => (
          <AgentMessage key={i} message={msg} agentStatus={agentStatus} />
        ))}

        {streamingText && (
          <AgentMessage message={{ role: 'assistant', content: streamingText }} agentStatus={agentStatus} />
        )}
        
        {isLoading && (
          <div className="chat-loading">
            {agentStatus 
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
