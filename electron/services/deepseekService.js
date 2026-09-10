const { app } = require('electron');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
  }

  getApiKey() {
    // Try to load from project root .env first (development)
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env.DEEPSEEK_API_KEY) {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        return this.apiKey;
      }
    }

    // Then try to load from user data config.json (production)
    try {
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.DEEPSEEK_API_KEY) {
          this.apiKey = config.DEEPSEEK_API_KEY;
        }
      }
    } catch (e) {
      console.warn("Could not read API key from config.json", e);
    }

    return this.apiKey;
  }

  /**
   * Test the connection to the DeepSeek API
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('DeepSeek API key is not configured.');
    }

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'deepseek-v4-pro',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid DeepSeek API key.');
        throw new Error(`API error: ${response.status} ${response.statusText}`);
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
   * Send a chat message with full conversation history to DeepSeek
   * @param {Array<{role: string, content: string}>} messages 
   * @returns {Promise<string>}
   */
  async sendMessage(messages, tools = null) {
    const currentKey = this.getApiKey();
    if (!currentKey) {
      throw new Error('La clé API DeepSeek n\'est pas configurée. Veuillez l\'ajouter dans vos paramètres.');
    }

    try {
      const payload = {
        model: 'deepseek-v4-pro',
        messages: messages,
        temperature: 0.2
      };

      if (tools) {
        payload.tools = tools;
      }

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid DeepSeek API key.');
        if (response.status === 429) throw new Error('DeepSeek API limit reached.');
        
        const errText = await response.text();
        throw new Error(`API error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      return data.choices[0].message;

    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('The request timed out.');
      }
      if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('ENOTFOUND')) {
        throw new Error('OFFLINE_ERROR');
      }
      throw err;
    }
  }
}

module.exports = new DeepSeekService();
