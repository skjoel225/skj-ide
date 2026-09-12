const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
// Force using the production backend for now so AI chat works locally without starting the backend
const BACKEND_URL = process.env.LOCAL_BACKEND ? 'http://localhost:3000' : 'https://skj-ide.onrender.com';
const SKJ_APP_TOKEN = 'skj-default-dev-token-xyz123'; // Token partagé avec le backend

class AIClient {
  /**
   * Test the connection to the backend
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/test`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SKJ_APP_TOKEN}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur backend: ${response.status}`);
      }
      return true;
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('ENOTFOUND')) {
        throw new Error('OFFLINE_ERROR');
      }
      throw err;
    }
  }

  /**
   * Send a chat message to the SKJ Backend
   * @param {Array<{role: string, content: string}>} messages 
   * @param {Array} tools 
   * @param {Function} onChunk Optional callback for streaming
   * @returns {Promise<any>}
   */
  async sendMessage(messages, tools = null, onChunk = null) {
    try {
      const payload = {
        messages: messages
      };

      if (tools) {
        payload.tools = tools;
      }

      const response = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SKJ_APP_TOKEN}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        if (errData && errData.error && errData.error.code === 'OFFLINE_ERROR') {
          throw new Error('OFFLINE_ERROR');
        }
        if (response.status === 401 || response.status === 403) {
           throw new Error('Erreur d\'authentification avec le backend SKJ IDE.');
        }
        throw new Error(errData?.error?.message || `Erreur API backend: ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream')) {
        // If not a stream (e.g. backend error returned as JSON)
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Erreur inconnue renvoyée par le backend.');
        }
        return data.message;
      }

      // Handle streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let finalMessage = {
        role: 'assistant',
        content: '',
        tool_calls: []
      };

      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line in the buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('data:')) continue;
          
          const dataStr = trimmedLine.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            const delta = data.choices && data.choices[0] && data.choices[0].delta;
            if (!delta) continue;

            // Accumulate content
            if (delta.content) {
              finalMessage.content += delta.content;
              if (onChunk) onChunk({ type: 'content', content: delta.content });
            }

            // Accumulate tool calls
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                if (!finalMessage.tool_calls[index]) {
                  finalMessage.tool_calls[index] = {
                    id: tc.id,
                    type: tc.type || 'function',
                    function: { name: '', arguments: '' }
                  };
                }
                if (tc.id) finalMessage.tool_calls[index].id = tc.id;
                if (tc.function?.name) finalMessage.tool_calls[index].function.name += tc.function.name;
                if (tc.function?.arguments) finalMessage.tool_calls[index].function.arguments += tc.function.arguments;
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE line:', line, e);
          }
        }
      }

      // Cleanup trailing buffer if any
      if (buffer.trim().startsWith('data:')) {
         const dataStr = buffer.trim().replace(/^data:\s*/, '');
         if (dataStr !== '[DONE]') {
            try {
              const data = JSON.parse(dataStr);
              if (data.choices && data.choices[0] && data.choices[0].delta?.content) {
                 finalMessage.content += data.choices[0].delta.content;
              }
            } catch (e) {}
         }
      }

      // Filter out nulls from tool_calls array (in case of sparse arrays)
      if (finalMessage.tool_calls.length > 0) {
        finalMessage.tool_calls = finalMessage.tool_calls.filter(Boolean);
      } else {
        delete finalMessage.tool_calls;
      }

      return finalMessage;

    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('The request timed out.');
      }
      if (err.message === 'OFFLINE_ERROR' || err.message.includes('fetch') || err.message.includes('network') || err.message.includes('ENOTFOUND')) {
        throw new Error('OFFLINE_ERROR');
      }
      throw err;
    }
  }
}

module.exports = new AIClient();
