const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const BACKEND_URL = isDev ? 'http://localhost:3000' : 'https://skj-ide-api.onrender.com';
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
   * @returns {Promise<any>}
   */
  async sendMessage(messages, tools = null) {
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

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Erreur inconnue renvoyée par le backend.');
      }
      return data.message;

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
