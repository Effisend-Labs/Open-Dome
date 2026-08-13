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

function isVercel() {
  return (
    process.env.VERCEL === '1' ||
    process.env.VERCEL === 'true' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  );
}

export function getOpenDomeAppUrl() {
  const fromEnv = stripQuotes(
    process.env.OPENDOME_APP_URL || process.env.EXPO_PUBLIC_OD_HOST_URL,
  ).replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (isVercel()) return 'https://app.opendome.xyz';
  return 'http://localhost:8082';
}

export function getAdminBridgeUrl() {
  const fromEnv = stripQuotes(
    process.env.ADMIN_BRIDGE_URL || process.env.EXPO_PUBLIC_ADMIN_BRIDGE_URL,
  ).replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (isVercel()) return 'https://admin.opendome.xyz';
  return 'http://localhost:8090';
}
