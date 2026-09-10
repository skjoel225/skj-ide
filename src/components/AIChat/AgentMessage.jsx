import React from 'react';
import Markdown from 'react-markdown';
import './ChatPanel.css';

export default function AgentMessage({ message, agentStatus }) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
  
  if (isTool) {
    // We can hide raw tool results or show them as debug info
    return null; 
  }

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-ai'}`}>
      <div className="chat-message-header">
        <span className="chat-message-role">{isUser ? 'USER' : '🤖 AGENT'}</span>
      </div>
      <div className="chat-message-content">
        {isUser ? (
          <div className="chat-text">{message.content}</div>
        ) : (
          <>
            {message.content && <div className="chat-markdown"><Markdown>{message.content}</Markdown></div>}
            
            {hasToolCalls && (
              <div className="agent-tool-calls">
                {message.tool_calls.map((call, idx) => {
                  // Find if this tool call matches the current executing status
                  const isExecuting = agentStatus && agentStatus.status === 'tool_executing' && agentStatus.tool === call.function.name;
                  const isResult = agentStatus && agentStatus.status === 'tool_result' && agentStatus.tool === call.function.name;
                  
                  return (
                    <div key={idx} className="tool-call-item">
                      <span className="tool-icon">{isExecuting ? '⏳' : '✓'}</span>
                      <span className="tool-name">{call.function.name}</span>
                      <span className="tool-args truncate">{call.function.arguments}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
