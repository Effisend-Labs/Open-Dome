export async function checkoutDayPlan({ quote, token, toAddress }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:8082';

  const res = await fetch('/api/x402-pay', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      serviceUrl: `${origin}/api/checkout`,
      fetchOptions: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ quote, toAddress }),
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.details || 'Checkout failed');
  }
  return data.data || data;
}

export async function askDomeConsultant({ text, token, history }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/agent', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: text,
      mode: 'dome',
      messages: history,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.details || 'Agent failed');
  }
  return data;
}
