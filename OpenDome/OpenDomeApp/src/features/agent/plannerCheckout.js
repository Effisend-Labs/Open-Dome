export async function checkoutDayPlan({ quote, token, toAddress }) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify({ quote, toAddress }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.details || 'Checkout failed');
  }
  return data;
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
