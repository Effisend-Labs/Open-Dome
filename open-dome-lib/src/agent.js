export class AgentAPI {
  constructor() {
    this.resolvers = new Map();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'OPENDOME_AI_RESPONSE') {
          const { id, response, error } = event.data;
          if (this.resolvers.has(id)) {
            const { resolve, reject } = this.resolvers.get(id);
            if (error) reject(new Error(error));
            else resolve(response);
            this.resolvers.delete(id);
          }
        }
      });
    }
  }

  /**
   * Send a prompt to the AI Agent via the Sandbox Server proxy
   * @param {string} text - The prompt text
   * @returns {Promise<string>} The agent's response
   */
  async prompt(text) {
    if (typeof window === 'undefined' || window.parent === window) {
      throw new Error('AgentAPI must be used within an Open-Dome Sandbox iframe.');
    }

    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      this.resolvers.set(id, { resolve, reject });

      window.parent.postMessage({
        type: 'OPENDOME_AI_PROMPT',
        id,
        payload: { prompt: text }
      }, '*');
    });
  }
}

export const Agent = new AgentAPI();
