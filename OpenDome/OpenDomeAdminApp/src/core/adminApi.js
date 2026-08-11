let hostJwt = null;

export function setHostJwt(token) {
  hostJwt = token || null;
}

export function getHostJwt() {
  return hostJwt;
}

export async function adminFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (hostJwt) {
    headers.Authorization = `Bearer ${hostJwt}`;
  }

  return fetch(path, { ...options, headers });
}
