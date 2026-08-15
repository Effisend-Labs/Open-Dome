/**
 * Host may return a string (legacy) or
 * { response, modelLabel, tools, explorerUrl, extra }.
 */
export function agentReplyText(res) {
  if (typeof res === 'string') return res;
  if (res && typeof res.response === 'string') return res.response;
  if (res?.data && typeof res.data.response === 'string') return res.data.response;
  return '';
}

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
        
        if (event.data && event.data.type === 'OPENDOME_PAYMENT_RESPONSE') {
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
   * Send a prompt to the AI Agent via the host bridge.
   * @param {string} text
   * @returns {Promise<string|{ response?: string, modelLabel?: string, tools?: any, explorerUrl?: string, extra?: any }>}
   */
  async prompt(text, options = {}) {
    if (typeof window === 'undefined' || window.parent === window) {
      throw new Error('AgentAPI must be used within an Open-Dome Sandbox iframe.');
    }

    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      this.resolvers.set(id, { resolve, reject });

      window.parent.postMessage({
        type: 'OPENDOME_AI_PROMPT',
        id,
        payload: {
          prompt: text,
          mode: options.mode || 'dome',
          modelId: options.modelId,
          messages: options.messages,
        }
      }, '*');
    });
  }

  /**
   * Pay for an x402 service via the Sandbox Host
   * @param {string} serviceUrl - The URL of the API to pay for
   * @param {string} amount - The amount to pay
   * @param {object} fetchOptions - Optional fetch configuration (e.g. POST methods, body)
   * @returns {Promise<any>} The result of the payment and the API response
   */
  async pay(serviceUrl, amount, fetchOptions = {}) {
    if (typeof window === 'undefined' || window.parent === window) {
      throw new Error('AgentAPI must be used within an Open-Dome Sandbox iframe.');
    }

    return new Promise((resolve, reject) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      this.resolvers.set(id, { resolve, reject });

      window.parent.postMessage({
        type: 'OPENDOME_PAYMENT_INTENT',
        id,
        payload: { serviceUrl, amount, fetchOptions }
      }, '*');
    });
  }
}

export const Agent = new AgentAPI();
