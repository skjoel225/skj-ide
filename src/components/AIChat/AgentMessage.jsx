import React from 'react';
import Markdown from 'react-markdown';
import './ChatPanel.css';

export default function AgentMessage({ message, agentStatus }) {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';
  const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
  
  const isSystem = message.role === 'system';
  
  if (isTool || isSystem) {
    // We hide raw tool results and the system prompt from the UI
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
                    <details key={idx} className="tool-call-item">
                      <summary className="tool-summary" style={{ cursor: 'pointer', userSelect: 'none' }}>
                        <span className="tool-icon">{isExecuting ? '⏳' : '✓'}</span>
                        <span className="tool-name" style={{ marginLeft: '6px', fontWeight: 'bold' }}>Action: {call.function.name}</span>
                        <span style={{ fontSize: '12px', opacity: 0.6, marginLeft: '8px' }}>(Cliquer pour voir les détails)</span>
                      </summary>
                      <pre className="tool-args" style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflowX: 'auto' }}>
                        {call.function.arguments}
                      </pre>
                    </details>
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
