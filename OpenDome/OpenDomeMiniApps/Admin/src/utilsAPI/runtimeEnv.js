/**
 * Single source for Admin runtime: local/dev vs Vercel/production.
 * Matches OpenDomeApp / Sandbox FIRESTORE_ENV conventions.
 */

function stripQuotes(value) {
  if (value == null) return '';
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

/**
 * @returns {'dev' | 'production'}
 */
export function getFirestoreEnv() {
  const explicit = stripQuotes(process.env.FIRESTORE_ENV).toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'production';
  if (explicit === 'local' || explicit === 'dev') return 'dev';

  // Vercel production / preview share cloud "production" collections
  if (
    process.env.VERCEL === '1' ||
    process.env.VERCEL === 'true' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  ) {
    return 'production';
  }

  return 'dev';
}

export function isDevRuntime() {
  return getFirestoreEnv() === 'dev';
}

export function isProductionRuntime() {
  return getFirestoreEnv() === 'production';
}

export function firestoreCollection(base) {
  return isDevRuntime() ? `Dev${base}` : base;
}

/**
 * Host OpenDomeApp used to verify passkey JWTs.
 * Override with OPENDOME_APP_URL when needed.
 */
export function getOpenDomeAppUrl() {
  const fromEnv = stripQuotes(process.env.OPENDOME_APP_URL).replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (isProductionRuntime()) {
    return 'https://app.opendome.xyz';
  }
  // OpenDomeApp `npm run web` uses port 8082 (see OpenDomeApp/package.json)
  return 'http://localhost:8082';
}

/** Short label for UI / logs */
export function getRuntimeLabel() {
  return isDevRuntime() ? 'DEV' : 'PROD';
}

export function getGodUsernameLower() {
  const raw = (
    stripQuotes(process.env.ADMIN_GOD_USERNAME) ||
    stripQuotes(process.env.ADMIN_USERNAME) ||
    'altaga'
  )
    .replace(/^@/, '')
    .toLowerCase();
  return raw;
}
