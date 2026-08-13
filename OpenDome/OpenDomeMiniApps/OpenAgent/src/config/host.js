export function getHostBaseUrl() {
  const envHost =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_HOST_URL : null;
  if (envHost) return String(envHost).replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    try {
      const parent = new URLSearchParams(window.location.search).get('parentOrigin');
      if (parent) return parent.replace(/\/$/, '');
    } catch {
      // ignore
    }
    try {
      const ancestor = window.location.ancestorOrigins?.[0];
      if (ancestor) return String(ancestor).replace(/\/$/, '');
    } catch {
      // ignore
    }
  }

  return 'http://localhost:8082';
}

export function getAgentApiUrl() {
  return (
    (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_OD_AGENT_URL) ||
    `${getHostBaseUrl()}/api/agent`
  );
}
