/**
 * Server-only docking secret for OpenDome host handshake.
 */
export async function GET() {
  const token = process.env.OD_APP_TOKEN;
  const appId = process.env.EXPO_PUBLIC_OD_APP_ID || process.env.OD_APP_ID || null;

  if (!token) {
    return Response.json(
      { error: 'OD_APP_TOKEN is not configured on the server' },
      { status: 500 }
    );
  }

  return Response.json({ appId, token });
}
