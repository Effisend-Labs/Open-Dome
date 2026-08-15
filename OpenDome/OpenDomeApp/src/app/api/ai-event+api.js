import jwt from 'jsonwebtoken';
import { emitAiEvent } from '../../utilsAPI/aiTelemetry.js';

const ALLOWED = new Set([
  'dome:plan_day',
  'dome:events',
  'dome:quote',
]);

const WINNERS = new Set(['pulse', 'zen', 'curator', 'local']);

/**
 * Client-side TDC planner (council) → Cloud Logging.
 * Any signed-in OpenDome JWT. Payload is allowlisted.
 */
export async function POST(request) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return Response.json({ error: 'JWT_SECRET is not set' }, { status: 500 });
    }
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      jwt.verify(auth.slice(7), JWT_SECRET);
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const baseIntent = String(body.intent || 'dome:plan_day');
    if (!ALLOWED.has(baseIntent)) {
      return Response.json({ error: 'intent not allowed' }, { status: 400 });
    }
    const winner = String(body.winner || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    const intent =
      baseIntent === 'dome:plan_day' && WINNERS.has(winner)
        ? `dome:plan_day:${winner}`
        : baseIntent;

    emitAiEvent({
      intent,
      confidence: 1,
      user_input: body.user_input || 'plan TDC day',
      latency_ms: body.latency_ms,
      model: 'tdc-council',
      model_label: 'TDC council (Pulse/Zen/Curator/Local)',
    });

    return Response.json({ ok: true, intent });
  } catch (e) {
    console.error('[App /api/ai-event POST]', e);
    return Response.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
