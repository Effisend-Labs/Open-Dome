import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const DOCKING_ISSUER = 'opendome-docking';
const DOCKING_AUDIENCE = 'opendome-host';

function verifyEnrollmentToken(token, secret) {
  const claims = jwt.verify(token, secret, {
    algorithms: ['HS512'],
    issuer: DOCKING_ISSUER,
    audience: DOCKING_AUDIENCE,
  });

  if (claims.token_use !== 'enrollment' || claims.role !== 'mini_app' || !claims.appId) {
    throw new Error('Invalid docking enrollment token');
  }
  return claims;
}

export async function POST(request) {
  const secret = process.env.DOCKING_JWT_TOKEN;
  const authorization = request.headers.get('authorization') || '';
  const enrollmentToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  if (!secret) {
    return Response.json({ error: 'DOCKING_JWT_TOKEN is not set' }, { status: 500 });
  }
  if (!enrollmentToken) {
    return Response.json({ error: 'Missing enrollment token' }, { status: 401 });
  }

  try {
    const enrollment = verifyEnrollmentToken(enrollmentToken, secret);
    const token = jwt.sign(
      {
        appId: enrollment.appId,
        role: 'mini_app',
        token_use: 'handshake',
        jti: crypto.randomUUID(),
      },
      secret,
      {
        algorithm: 'HS512',
        audience: DOCKING_AUDIENCE,
        expiresIn: '10m',
        issuer: DOCKING_ISSUER,
      }
    );

    return Response.json({ token, appId: enrollment.appId, expiresInSec: 600 });
  } catch {
    return Response.json({ error: 'Invalid enrollment token' }, { status: 401 });
  }
}
