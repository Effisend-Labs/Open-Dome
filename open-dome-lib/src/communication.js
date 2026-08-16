/**
 * Open-Dome Communication SDK — temporarily disabled.
 * MQTT realtime is parked until a broker + ACL model is ready again.
 * API shape is kept so existing imports/call sites do not break.
 */
export class CommunicationAPI {
  static PUBLIC_CHANNEL = 'opendome/public';
  static DISABLED_REASON = 'Communication (MQTT) is temporarily disabled.';

  constructor() {
    this.client = null;
    this.appId = null;
    this.subscriptions = new Map();
    this.PUBLIC_CHANNEL = CommunicationAPI.PUBLIC_CHANNEL;
    this.disabled = true;
  }

  _buildTopic(subtopic) {
    if (!subtopic) return `opendome/${this.appId || 'unknown'}`;
    const clean = String(subtopic).replace(/^\/+/, '');
    if (clean === 'opendome/public' || clean.startsWith('opendome/public/')) {
      return clean;
    }
    if (
      this.appId &&
      (clean === `opendome/${this.appId}` || clean.startsWith(`opendome/${this.appId}/`))
    ) {
      return clean;
    }
    if (!this.appId) return `opendome/${clean}`;
    return `opendome/${this.appId}/${clean}`;
  }

  connect(config) {
    if (config?.appId) this.appId = config.appId;
    console.warn(`[Open-Dome Communication] ${CommunicationAPI.DISABLED_REASON}`);
    this.client = null;
    return null;
  }

  subscribe() {
    throw new Error(CommunicationAPI.DISABLED_REASON);
  }

  subscribeAll() {
    throw new Error(CommunicationAPI.DISABLED_REASON);
  }

  publish() {
    throw new Error(CommunicationAPI.DISABLED_REASON);
  }

  unsubscribe(subtopic) {
    const resolved = this._buildTopic(subtopic);
    this.subscriptions.delete(resolved);
  }

  disconnect() {
    this.client = null;
    this.subscriptions.clear();
  }
}

export const Communication = new CommunicationAPI();
