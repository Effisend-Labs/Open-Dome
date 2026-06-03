import mqtt from 'mqtt';

/**
 * Open-Dome Communication SDK (Notice Board)
 * Powered by MQTT over WebSockets for real-time communication.
 *
 * Topic Hierarchy
 * ───────────────────────────────────────────────────────────────
 *  opendome/{appId}/{subtopic}   — App-scoped channel (default)
 *  opendome/public               — Ecosystem-wide public channel
 *    (any topic that equals or starts with PUBLIC_CHANNEL
 *     bypasses the appId prefix and is passed through as-is)
 *
 * Usage
 * ───────────────────────────────────────────────────────────────
 *  Communication.connect({ jwt, appId: 'my-app' })
 *  Communication.publish('chat', payload)           → opendome/my-app/chat
 *  Communication.publish(Communication.PUBLIC_CHANNEL, payload) → opendome/public
 *  Communication.subscribe('chat', cb)              → opendome/my-app/chat
 *  Communication.subscribeAll(cb)                   → opendome/# (wildcard, for sandbox debug)
 */
export class CommunicationAPI {
  /** Ecosystem-wide public broadcast channel (no appId prefix). */
  static PUBLIC_CHANNEL = 'opendome/public';

  constructor() {
    this.client = null;
    this.appId = null;
    this.subscriptions = new Map(); // resolved topic → callback
    this.PUBLIC_CHANNEL = CommunicationAPI.PUBLIC_CHANNEL;
  }

  // ── Internals ────────────────────────────────────────────────

  _buildTopic(subtopic) {
    if (!subtopic) return `opendome/${this.appId || 'unknown'}`;
    const clean = String(subtopic).replace(/^\/+/, ''); // strip leading slashes
    
    // 1. If it's a public channel, pass through
    if (
      clean === 'opendome/public' ||
      clean.startsWith('opendome/public/')
    ) {
      return clean;
    }

    // 2. If it's already fully-qualified with this appId, pass through
    if (this.appId && (
      clean === `opendome/${this.appId}` ||
      clean.startsWith(`opendome/${this.appId}/`)
    )) {
      return clean;
    }

    // 3. Otherwise, prefix it with opendome/{appId}/
    if (!this.appId) {
      console.warn('[Open-Dome Communication] appId not set — topic will not be namespaced.');
      return `opendome/${clean}`;
    }
    return `opendome/${this.appId}/${clean}`;
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Connect to the MQTT Broker.
   * @param {Object} config - { appId, host, port, username, password, jwt, protocol, path }
   */
  connect(config) {
    if (this.client && this.client.connected) {
      console.log('[Open-Dome Communication] Already connected.');
      return this.client;
    }

    const {
      appId,
      host = 'mqtt.effisend.dpdns.org',
      port = 443,
      username,
      password,
      jwt,
      protocol = 'wss',
      path = '/'
    } = config;

    if (appId) this.appId = appId;

    const url = `${protocol}://${host}${port === 443 ? '' : `:${port}`}${path === '/' ? '' : path}`;
    const mqttUsername = username || (jwt ? 'opendome_mini_apps' : undefined);

    console.log(`[Open-Dome Communication] Connecting to ${url} as ${mqttUsername}, appId="${this.appId}"...`);

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
      console.log('[Open-Dome Communication] Connected successfully.');
      // Resubscribe to all previously registered topics
      this.subscriptions.forEach((_, resolvedTopic) => {
        this.client.subscribe(resolvedTopic);
      });
    });

    this.client.on('message', (topic, message) => {
      const payload = message.toString();
      // Deliver to an exact-topic handler or the wildcard handler (stored as '#')
      const handler = this.subscriptions.get(topic) || this.subscriptions.get('#');
      if (!handler) return;
      try {
        handler(JSON.parse(payload), topic);
      } catch (e) {
        handler(payload, topic);
      }
    });

    this.client.on('error', (err) => {
      console.error('[Open-Dome Communication] Connection error:', err.message);
    });

    this.client.on('close', () => {
      console.warn('[Open-Dome Communication] Connection closed.');
    });

    return this.client;
  }

  /**
   * Subscribe to an app-scoped subtopic (or the public channel).
   * @param {string} subtopic  e.g. 'chat', 'events', Communication.PUBLIC_CHANNEL
   * @param {Function} callback  (data, resolvedTopic) => void
   * @returns {string} The resolved full topic path
   */
  subscribe(subtopic, callback) {
    if (!this.client) throw new Error('Must call connect() before subscribe().');
    const resolved = this._buildTopic(subtopic);
    this.subscriptions.set(resolved, callback);
    this.client.subscribe(resolved);
    console.log(`[Open-Dome Communication] Subscribed → ${resolved}`);
    return resolved;
  }

  /**
   * Subscribe to the full opendome/# wildcard.
   * Intended for sandbox/debug use — receives every message across all apps.
   * @param {Function} callback  (data, topic) => void
   */
  subscribeAll(callback) {
    if (!this.client) throw new Error('Must call connect() before subscribeAll().');
    const wildcard = 'opendome/#';
    this.subscriptions.set('#', callback); // keyed by '#' for easy lookup in on('message')
    this.client.subscribe(wildcard);
    console.log(`[Open-Dome Communication] Subscribed (wildcard) → ${wildcard}`);
  }

  /**
   * Publish a message to an app-scoped subtopic (or the public channel).
   * @param {string} subtopic  e.g. 'chat', 'events', Communication.PUBLIC_CHANNEL
   * @param {Object|string} message
   * @returns {string} The resolved full topic path
   */
  publish(subtopic, message) {
    if (!this.client) throw new Error('Must call connect() before publish().');
    const resolved = this._buildTopic(subtopic);
    const payload = typeof message === 'object' ? JSON.stringify(message) : message;
    this.client.publish(resolved, payload);
    console.log(`[Open-Dome Communication] Published → ${resolved}`);
    return resolved;
  }

  /**
   * Unsubscribe from a subtopic.
   * @param {string} subtopic
   */
  unsubscribe(subtopic) {
    const resolved = this._buildTopic(subtopic);
    if (this.client) this.client.unsubscribe(resolved);
    this.subscriptions.delete(resolved);
  }

  /**
   * Disconnect from the broker.
   */
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
    this.subscriptions.clear();
  }
}

export const Communication = new CommunicationAPI();
