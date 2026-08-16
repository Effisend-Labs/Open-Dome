/**
 * Prefer a short-lived docking JWT from the mini-app server (`/api/docking-token`).
 * Raw OD_APP_TOKEN must never ship to the browser.
 */
export async function resolveAppCredentials(config = {}) {
  const appId =
    config.appId ||
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_APP_ID : null) ||
    null;

  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/docking-token');
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.token) {
          return {
            appToken: body.token,
            appId: appId || body.appId || null,
          };
        }
      }
    } catch {
      // fall through
    }
  }

  return { appToken: null, appId };
}
