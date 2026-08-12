/**
 * Runtime env for Admin UI (client). Mirrors server detection without GCP secrets.
 * - Local Expo / localhost → DEV
 * - admin.opendome.xyz / Vercel → PROD
 */
export function getClientRuntimeLabel() {
  if (typeof window === 'undefined') {
    return process.env.VERCEL || process.env.VERCEL_ENV ? 'PROD' : 'DEV';
  }
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'DEV';
    if (host.endsWith('opendome.xyz') || host.includes('vercel.app')) return 'PROD';
  } catch {
    // ignore
  }
  if (process.env.EXPO_PUBLIC_ADMIN_ENV === 'production') return 'PROD';
  if (process.env.EXPO_PUBLIC_ADMIN_ENV === 'dev') return 'DEV';
  return 'DEV';
}
