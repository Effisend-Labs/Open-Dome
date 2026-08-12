let hostJwt = null;

export function setHostJwt(token) {
  hostJwt = token || null;
}

export function getHostJwt() {
  return hostJwt;
}

export async function adminFetch(path, options = {}) {
  const token = options.token || hostJwt;
  const { token: _drop, headers: extraHeaders, ...rest } = options;
  const headers = {
    'Content-Type': 'application/json',
    ...(extraHeaders || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-OpenDome-Jwt'] = token;
  }

  return fetch(path, { ...rest, headers });
}
