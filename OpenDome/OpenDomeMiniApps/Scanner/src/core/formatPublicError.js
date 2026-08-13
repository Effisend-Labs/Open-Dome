/** Strip Node/Vercel internals before showing an error in the scanner UI. */
export function formatPublicError(raw, fallback = 'Request failed') {
  const text = String(raw || fallback).split('Require stack')[0].trim();
  if (/cannot find module ['"]ethers['"]/i.test(text)) {
    return 'Scanner backend could not load the chain library. Redeploy Admin and retry.';
  }
  if (/cannot find module/i.test(text)) {
    return 'Scanner backend is missing a dependency. Try again in a moment.';
  }
  return (text || fallback).slice(0, 180);
}
