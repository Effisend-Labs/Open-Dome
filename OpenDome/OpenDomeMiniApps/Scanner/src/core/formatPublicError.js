/** Strip Node/Vercel internals before showing an error in the scanner UI. */
export function formatPublicError(raw, fallback = 'Request failed') {
  const text = String(raw || fallback).split('Require stack')[0].trim();
  if (/cannot find module ['"]?(ethers|viem)['"]?/i.test(text)) {
    return 'Could not reach the chain library. Redeploy OpenDomeApp and retry.';
  }
  if (/cannot find module/i.test(text)) {
    return 'A server dependency is missing. Try again in a moment.';
  }
  return (text || fallback).slice(0, 180);
}
