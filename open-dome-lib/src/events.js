import mqtt from 'mqtt';

/**
 * Open-Dome Events SDK (Notice Board)
 * Powered by MQTT over WebSockets for real-time event distribution.
 */
export class EventsAPI {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
  }

  /**
   * Connect to the MQTT Broker.
   * @param {Object} config - { host, port, username, password, protocol, path }
   */
  connect(config) {
    if (this.client && this.client.connected) {
      console.log('[Open-Dome Events] Already connected.');
      return this.client;
    }

    const { 
      host = 'mqtt.effisend.dpdns.org', 
      port = 443, 
      username, 
      password, 
      jwt, // New JWT support
      protocol = 'wss', 
      path = '/'
    } = config;

    const url = `${protocol}://${host}${port === 443 ? '' : `:${port}`}${path === '/' ? '' : path}`;
    const mqttUsername = username || (jwt ? 'opendome_mini_apps' : undefined);
    
    console.log(`[Open-Dome Events] Connecting to ${url} as ${mqttUsername}...`);

    this.client = mqtt.connect(url, {
      username: mqttUsername,
      password: jwt || password,
      clientId: `opendome_mini_app_${Math.random().toString(16).slice(2, 6)}`,
      rejectUnauthorized: false,
      protocolVersion: 4,
      connectTimeout: 20000,
      wsOptions: { protocol: 'mqtt' }
    });

    this.client.on('connect', () => {
      console.log('[Open-Dome Events] Connected successfully.');
      // Resubscribe to existing topics if any
      this.subscriptions.forEach((_, topic) => {
        this.client.subscribe(topic);
      });
    });

    this.client.on('message', (topic, message) => {
      const payload = message.toString();
      try {
        const data = JSON.parse(payload);
        if (this.subscriptions.has(topic)) {
          this.subscriptions.get(topic)(data, topic);
        }
      } catch (e) {
        // Fallback to raw string if not JSON
        if (this.subscriptions.has(topic)) {
          this.subscriptions.get(topic)(payload, topic);
        }
      }
    });

    this.client.on('error', (err) => {
      console.error('[Open-Dome Events] Connection error:', err.message);
    });

    this.client.on('close', () => {
      console.warn('[Open-Dome Events] Connection closed.');
    });

    return this.client;
  }

  /**
   * Subscribe to a topic (Notice Board).
   * @param {string} topic 
   * @param {Function} callback 
   */
  subscribe(topic, callback) {
    if (!this.client) {
      throw new Error("Must connect to Events API before subscribing.");
    }
    this.subscriptions.set(topic, callback);
    this.client.subscribe(topic);
    console.log(`[Open-Dome Events] Subscribed to topic: ${topic}`);
  }

  /**
   * Unsubscribe from a topic.
   * @param {string} topic 
   */
  unsubscribe(topic) {
    if (this.client) {
      this.client.unsubscribe(topic);
    }
    this.subscriptions.delete(topic);
  }

  /**
   * Publish an event to a topic.
   * @param {string} topic 
   * @param {Object|string} message 
   */
  publish(topic, message) {
    if (!this.client) {
      throw new Error("Must connect to Events API before publishing.");
    }
    const payload = typeof message === 'object' ? JSON.stringify(message) : message;
    this.client.publish(topic, payload);
  }

  /**
   * Disconnect from the broker.
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const Events = new EventsAPI();
