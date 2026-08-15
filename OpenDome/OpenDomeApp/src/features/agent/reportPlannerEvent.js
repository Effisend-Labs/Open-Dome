/**
 * Report a local TDC council plan to Cloud Logging (same stream as Gemini).
 * Fire-and-forget. Host origin only.
 */
export function reportPlannerEvent({ token, intent, winner, user_input, latency_ms } = {}) {
  if (!token || typeof fetch !== 'function') return;
  void fetch('/api/ai-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: intent || 'dome:plan_day',
      winner: winner || '',
      user_input: String(user_input || '').slice(0, 240),
      latency_ms: Number(latency_ms) || 0,
    }),
  }).catch(() => {});
}
