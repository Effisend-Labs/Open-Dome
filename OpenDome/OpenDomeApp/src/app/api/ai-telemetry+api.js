import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { readAiTelemetry } from '../../utilsAPI/aiTelemetry.js';

/**
 * Gemini agent telemetry from Cloud Logging (`opendome-ai-events`).
 * God JWT only — same gate as Admin merchant balances.
 */
export async function GET(request) {
  try {
    const actor = await verifyStaffFromRequest(request);
    if (!actor || actor.role !== 'god') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const payload = await readAiTelemetry({ limit: 200 });
    return Response.json(payload, {
      headers: { 'Cache-Control': 'private, max-age=15' },
    });
  } catch (e) {
    console.error('[App /api/ai-telemetry GET]', e);
    return Response.json(
      { error: e.message || 'Failed to load AI telemetry' },
      { status: 500 },
    );
  }
}
