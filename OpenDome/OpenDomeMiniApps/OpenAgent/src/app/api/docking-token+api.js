/**
 * Server-only exchange: Host converts enrollment credential into a short-lived
 * handshake JWT. OD_APP_TOKEN never reaches the browser.
 * Host URL auto-resolves (local App :8082 / prod app.opendome.xyz).
 */
import { exchangeDockingEnrollment } from 'opendome/dist/dockingHost.js';

export async function GET() {
  return exchangeDockingEnrollment();
}
