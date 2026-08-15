/**
 * Ask the host to re-sign the passkey JWT from the live Firestore role.
 */
export async function refreshHostSession(token) {
  if (!token) return null;
  try {
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.token) return null;
    return data;
  } catch {
    return null;
  }
}
