/**
 * Server-only docking credentials for Open-Dome handshake.
 * OD_APP_TOKEN must never be EXPO_PUBLIC_ / extra — only available here.
 */
export async function GET() {
  const token = process.env.OD_APP_TOKEN;
  const appId = process.env.EXPO_PUBLIC_OD_APP_ID || process.env.OD_APP_ID || null;

  if (!token) {
    return Response.json(
      { error: 'OD_APP_TOKEN is not configured on the server' },
      { status: 500 },
    );
  }

  return Response.json({ token, appId });
}
