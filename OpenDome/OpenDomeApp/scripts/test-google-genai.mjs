/**
 * Live Vertex / Gemini smoke test for OpenDomeApp.
 * Usage: node scripts/test-google-genai.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..');
const envPath = path.join(appRoot, '.env');

function loadEnv(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
  console.log(`  PASS  ${msg}`);
}

async function main() {
  console.log('\n=== OpenDomeApp Google GenAI smoke test ===\n');
  loadEnv(envPath);

  assert(Boolean(process.env.GCP_PROJECT_ID), 'GCP_PROJECT_ID set');
  assert(Boolean(process.env.GCP_CLIENT_EMAIL), 'GCP_CLIENT_EMAIL set');
  assert(Boolean(process.env.GCP_PRIVATE_KEY), 'GCP_PRIVATE_KEY set');

  const gcpCredsPath = path.join(os.tmpdir(), 'opendome-app-gcp-creds-test.json');
  fs.writeFileSync(
    gcpCredsPath,
    JSON.stringify({
      type: 'service_account',
      project_id: process.env.GCP_PROJECT_ID,
      private_key_id: 'opendome-app-test',
      private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GCP_CLIENT_EMAIL,
      client_id: 'opendome-app-test',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.GCP_CLIENT_EMAIL)}`,
      universe_domain: 'googleapis.com',
    }),
  );
  process.env.GOOGLE_APPLICATION_CREDENTIALS = gcpCredsPath;
  assert(fs.existsSync(gcpCredsPath), `Wrote ADC file ${gcpCredsPath}`);

  console.log('\n--- Construct GoogleGenAI (vertex) ---');
  let GoogleGenAI;
  try {
    ({ GoogleGenAI } = await import('@google/genai'));
    assert(typeof GoogleGenAI === 'function', 'GoogleGenAI export is a constructor');
  } catch (err) {
    throw new Error(`import @google/genai failed: ${err.message}`);
  }

  let ai;
  try {
    ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GCP_PROJECT_ID,
      location: 'global',
      httpOptions: { timeout: 60000 },
    });
    assert(Boolean(ai?.models), 'GoogleGenAI instance has models API');
  } catch (err) {
    throw new Error(`new GoogleGenAI failed: ${err.message}`);
  }

  const modelsToTry = [
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
    'gemini-3.6-flash',
    'gemini-3.1-pro',
    'gemini-3.1-pro-preview',
    'gemini-2.0-flash-001',
  ];

  console.log('\n--- generateContent ---');
  const working = [];
  let lastErr = null;
  for (const model of modelsToTry) {
    try {
      console.log(`  trying model=${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: 'Reply with exactly: OPENDOME_OK',
        config: { temperature: 0, maxOutputTokens: 64 },
      });
      const text = String(
        response?.text ||
          response?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
          '',
      ).trim();
      if (!text) {
        console.log(
          `  FAIL  ${model}: empty text (finish=${response?.candidates?.[0]?.finishReason || 'n/a'})`,
        );
        continue;
      }
      console.log(`  PASS  ${model} → ${text.slice(0, 80)}`);
      working.push(model);
    } catch (err) {
      lastErr = err;
      console.log(`  FAIL  ${model}: ${String(err.message || err).slice(0, 200)}`);
    }
  }

  if (!working.length) {
    throw new Error(
      `All models failed. Last error: ${lastErr?.message || lastErr}`,
    );
  }

  console.log(`\n── Google GenAI OK — working models: ${working.join(', ')} ──\n`);
  try {
    fs.unlinkSync(gcpCredsPath);
  } catch {
    // ignore
  }
}

main().catch((err) => {
  console.error('\n── FAILED ──');
  console.error(err.message || err);
  if (err.stack) console.error(err.stack.split('\n').slice(0, 8).join('\n'));
  process.exit(1);
});
