/** Keep only a USDC decimal (max 6 places). Strips paste junk. */
export function sanitizeUsdcAmount(raw) {
  const chars = String(raw ?? '');
  let out = '';
  let seenDot = false;
  let frac = 0;
  for (const ch of chars) {
    if (ch >= '0' && ch <= '9') {
      if (seenDot) {
        if (frac >= 6) continue;
        frac += 1;
      }
      out += ch;
      continue;
    }
    if ((ch === '.' || ch === ',') && !seenDot) {
      seenDot = true;
      if (!out) out = '0';
      out += '.';
    }
  }
  if (!out) return '';
  if (out.includes('.')) {
    const [whole, fracPart = ''] = out.split('.');
    const normalized = whole.replace(/^0+(?=\d)/, '') || '0';
    return `${normalized}.${fracPart}`;
  }
  return out.replace(/^0+(?=\d)/, '') || '0';
}

export function isUsdcAmountReady(amount) {
  if (!amount || amount === '.' || amount.endsWith('.')) return false;
  const n = Number(amount);
  return Number.isFinite(n) && n > 0;
}
