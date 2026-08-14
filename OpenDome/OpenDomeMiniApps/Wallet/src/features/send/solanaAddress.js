const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Map([...BASE58].map((char, index) => [char, index]));

function decodeBase58(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  let leadingZeros = 0;
  while (text[leadingZeros] === '1') leadingZeros += 1;

  const bytes = [];
  for (const char of text) {
    const digit = BASE58_MAP.get(char);
    if (digit == null) return null;

    let carry = digit;
    for (let index = bytes.length - 1; index >= 0; index -= 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.unshift(carry & 0xff);
      carry >>= 8;
    }
  }

  return leadingZeros + bytes.length;
}

export function isSolanaAddress(value) {
  const text = String(value || '').trim();
  return !text.startsWith('0x') && decodeBase58(text) === 32;
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
