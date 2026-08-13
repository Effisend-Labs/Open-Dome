const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isSolanaAddress(value) {
  const text = String(value || '').trim();
  return BASE58.test(text) && !text.startsWith('0x');
}

export function parseSolanaAddress(raw) {
  const text = String(raw || '').trim();
  if (isSolanaAddress(text)) return text;
  const match = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  return match && isSolanaAddress(match[0]) ? match[0] : null;
}

export function sanitizeSolanaAddressInput(raw) {
  const extracted = parseSolanaAddress(raw);
  if (extracted) return extracted;
  return [...String(raw || '')]
    .filter((ch) => /[1-9A-HJ-NP-Za-km-z]/.test(ch))
    .join('')
    .slice(0, 44);
}
