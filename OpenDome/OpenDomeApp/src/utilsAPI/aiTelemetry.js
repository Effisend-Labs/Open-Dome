import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { nodeRequire } from './nodeRequire.js';

const LOG_NAME = 'opendome-ai-events';
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'project-cadf416c-23aa-4f9b-be6';

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

export function sanitizeUserInput(raw) {
  const text = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b0x[a-fA-F0-9]{40}\b/g, '[addr]');
  return text.slice(0, 240);
}

export function buildAiEventPayload({
  intent,
  confidence,
  user_input,
  latency_ms,
  network,
} = {}) {
  const payload = {
    intent: String(intent || 'unknown').slice(0, 80),
    confidence: Number.isFinite(Number(confidence))
      ? Math.max(0, Math.min(1, Number(confidence)))
      : 0,
    user_input: sanitizeUserInput(user_input),
    latency_ms: Math.max(0, Math.round(Number(latency_ms) || 0)),
    timestamp: new Date().toISOString(),
  };
  if (network) payload.network = String(network).slice(0, 32);
  return payload;
}

/**
 * Fire-and-forget structured log to Cloud Logging stream `opendome-ai-events`.
 * Never throws into the agent request path.
 */
export function emitAiEvent(fields) {
  const payload = buildAiEventPayload(fields);
  void writeAiEvent(payload);
}

async function writeAiEvent(payload) {
  try {
    const log = getLog();
    const entry = log.entry(
      {
        resource: { type: 'global' },
        severity: 'INFO',
      },
      payload,
    );
    await log.write(entry);
  } catch (err) {
    console.warn('[AI Telemetry] write failed:', err?.message || err);
  }
}

function entryPayload(entry) {
  const data = entry?.data;
  if (!data || typeof data !== 'object') return {};
  return data;
}

function normalizeEntry(entry) {
  const data = entryPayload(entry);
  const ts =
    data.timestamp ||
    entry?.metadata?.timestamp?.seconds ||
    entry?.metadata?.timestamp ||
    null;
  const latency = Number(data.latency_ms);
  const confidence = Number(data.confidence);
  return {
    intent: String(data.intent || 'unknown').slice(0, 80),
    confidence: Number.isFinite(confidence) ? confidence : 0,
    user_input: sanitizeUserInput(data.user_input),
    latency_ms: Number.isFinite(latency) ? Math.round(latency) : 0,
    network: data.network ? String(data.network).slice(0, 32) : null,
    timestamp: ts ? new Date(ts).toISOString() : null,
  };
}

function summarizeAiEvents(events) {
  const latencies = events
    .map((e) => e.latency_ms)
    .filter((n) => Number.isFinite(n) && n >= 0);
  const avgLatencyMs = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : 0;
  const counts = new Map();
  for (const event of events) {
    counts.set(event.intent, (counts.get(event.intent) || 0) + 1);
  }
  const topIntents = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([intent, count]) => ({ intent, count }));
  return {
    source: 'cloud-logging',
    projectId: PROJECT_ID,
    logName: LOG_NAME,
    volume: events.length,
    avgLatencyMs,
    topIntents,
    events: events.slice(0, 40),
    loggingUrl: `https://console.cloud.google.com/logs/query;query=logName%3D%22projects%2F${PROJECT_ID}%2Flogs%2F${LOG_NAME}%22?project=${PROJECT_ID}`,
    bigqueryUrl: `https://console.cloud.google.com/bigquery?project=${PROJECT_ID}&ws=!1m5!1m4!4m3!1s${PROJECT_ID}!2sai_agent_logs!3sopendome_ai_events`,
  };
}

/** Recent `opendome-ai-events` from Cloud Logging. Requires logging.viewer. */
export async function readAiTelemetry({ limit = 200 } = {}) {
  ensureGcpCredentials();
  const { Logging } = nodeRequire('@google-cloud/logging');
  const logging = new Logging({ projectId: PROJECT_ID });
  const pageSize = Math.min(500, Math.max(1, Number(limit) || 200));
  const [entries] = await logging.getEntries({
    resourceNames: [`projects/${PROJECT_ID}`],
    filter: `logName="projects/${PROJECT_ID}/logs/${LOG_NAME}"`,
    pageSize,
    orderBy: 'timestamp desc',
  });
  const events = (entries || []).map(normalizeEntry);
  return summarizeAiEvents(events);
}
