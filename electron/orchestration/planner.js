const aiClient = require('../services/aiClient');

class Planner {
  /**
   * Generates a structured execution plan from a user prompt.
   * @param {string} taskDescription The user's request
   * @returns {Promise<Object>} The generated plan
   */
  async createPlan(taskDescription) {
    const systemPrompt = `You are the AI Planner for a multi-agent software development system.
Your job is to break down the user's task into a sequential plan of smaller tasks.
Each task must be assigned to ONE of the following specialized agents:
- developer (general coding, file creation)
- frontend (UI, CSS, React, Vue, HTML)
- backend (Node.js, APIs, database, server logic)
- tester (running tests, verifying builds)

Output the plan STRICTLY as a JSON object matching this schema, with no markdown formatting or other text:
{
  "task": "Global description",
  "steps": [
    {
      "id": 1,
      "agent": "developer",
      "description": "Analyze project structure",
      "status": "pending"
    },
    ...
  ]
}

Ensure that steps are in logical execution order.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: taskDescription }
    ];

    try {
      const response = await aiClient.sendMessage(messages);
      
      if (!response.success) {
        throw new Error(`Planner API Error: ${response.error}`);
      }

      // Try to parse the response as JSON.
      // Often LLMs wrap JSON in markdown (```json ... ```), so we clean it up if needed.
      let jsonString = response.data.content.trim();
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.slice(7, -3).trim();
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.slice(3, -3).trim();
      }

      const plan = JSON.parse(jsonString);
      return plan;
    } catch (err) {
      console.error('Failed to create plan:', err);
      throw new Error(`Planner failed: ${err.message}`);
    }
  }
}

module.exports = new Planner();
