import { getPublicPlatformConfig } from '../../utilsAPI/platformConfig';

/**
 * Public platform config for mini-apps (contract + merchant addresses).
 * No auth — these are not secrets; Host bridge still relays via same-origin.
 */
export async function GET() {
  try {
    return Response.json({
      success: true,
      ...getPublicPlatformConfig(),
    });
  } catch (e) {
    console.error('[App /api/platform-config]', e);
    return Response.json(
      { error: e.message || 'Failed to load platform config' },
      { status: 500 },
    );
  }
}
