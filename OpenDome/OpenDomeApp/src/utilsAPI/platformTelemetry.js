import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { nodeRequire } from './nodeRequire.js';

const LOG_NAME = 'opendome-platform-events';
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'project-cadf416c-23aa-4f9b-be6';

const EVENT_TYPES = new Set([
  'user_created',
  'pass_minted',
  'usdc_transfer',
  'checkout',
  'x402_payment',
  'gate_scan',
]);

let _log = null;

function ensureGcpCredentials() {
  const gcpCredsPath = path.join(os.tmpdir(), 'opendome-app-gcp-creds.json');
  if (!fs.existsSync(gcpCredsPath) && process.env.GCP_PRIVATE_KEY) {
    fs.writeFileSync(
      gcpCredsPath,
      JSON.stringify({
        type: 'service_account',
        project_id: process.env.GCP_PROJECT_ID,
        private_key_id: 'opendome-app-key',
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GCP_CLIENT_EMAIL,
        client_id: 'opendome-app-client',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_CLIENT_EMAIL || '')}`,
        universe_domain: 'googleapis.com',
      }),
    );
  }
  if (fs.existsSync(gcpCredsPath)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredsPath;
  }
}

function getLog() {
  if (_log) return _log;
  ensureGcpCredentials();
  const { Logging } = nodeRequire('@google-cloud/logging');
  _log = new Logging({ projectId: PROJECT_ID }).log(LOG_NAME);
  return _log;
}

export function buildPlatformEventPayload({
  event_type,
  status,
  network,
  amount_usdc,
  count,
  latency_ms,
} = {}) {
  const type = EVENT_TYPES.has(event_type) ? event_type : 'unknown';
  const payload = {
    event_type: type,
    status: status === 'error' ? 'error' : 'ok',
    latency_ms: Math.max(0, Math.round(Number(latency_ms) || 0)),
    timestamp: new Date().toISOString(),
  };
  if (network) payload.network = String(network).slice(0, 32);
  const amount = Number(amount_usdc);
  if (Number.isFinite(amount) && amount >= 0) {
    payload.amount_usdc = Math.round(amount * 1e6) / 1e6;
  }
  const n = Number(count);
  if (Number.isFinite(n) && n > 0) payload.count = Math.round(n);
  return payload;
}

/** Fire-and-forget platform event. Never throws into the request path. */
export function emitPlatformEvent(fields) {
  const payload = buildPlatformEventPayload(fields);
  void writePlatformEvent(payload);
}

async function writePlatformEvent(payload) {
  try {
    const log = getLog();
    const entry = log.entry(
      { resource: { type: 'global' }, severity: payload.status === 'error' ? 'ERROR' : 'INFO' },
      payload,
    );
    await log.write(entry);
  } catch (err) {
    console.warn('[Platform Telemetry] write failed:', err?.message || err);
  }
}
