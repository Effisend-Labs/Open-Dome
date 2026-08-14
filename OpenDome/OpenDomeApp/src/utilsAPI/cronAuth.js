/**
 * Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` automatically.
 * Keep this separate from user/staff JWT authorization.
 */
export function isAuthorizedCronRequest(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export function unauthorizedCronResponse() {
  return Response.json({ error: 'Unauthorized cron request' }, { status: 401 });
}
