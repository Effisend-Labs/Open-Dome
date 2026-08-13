function readExpoExtraToken() {
  try {
    // eslint-disable-next-line global-require
    const Constants = require('expo-constants').default;
    return Constants?.expoConfig?.extra?.odAppToken || null;
  } catch {
    return null;
  }
}

/**
 * Docking secret stays on the mini-app server. Developers never fetch it.
 */
export async function resolveAppCredentials(config = {}) {
  const appId =
    config.appId ||
    (typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_APP_ID : null) ||
    null;

  const appToken =
    config.appToken ||
    config.token ||
    (typeof process !== 'undefined' ? process.env.OD_APP_TOKEN : null) ||
    readExpoExtraToken();

  if (appToken) return { appToken, appId };

  if (typeof fetch === 'undefined') return { appToken: null, appId };

  try {
    const res = await fetch('/api/docking-token');
    if (!res.ok) return { appToken: null, appId };
    const body = await res.json().catch(() => ({}));
    return {
      appToken: body.token || null,
      appId: appId || body.appId || null,
    };
  } catch {
    return { appToken: null, appId };
  }
}
