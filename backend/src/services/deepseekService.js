const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

class DeepSeekService {
  async testConnection() {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('DeepSeek API key is not configured on the backend.');
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

  async sendMessage(messages, tools = null) {
    const currentKey = process.env.DEEPSEEK_API_KEY;
    if (!currentKey) {
      throw new Error('La clé API DeepSeek n\'est pas configurée sur le backend.');
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
