const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Map([...BASE58].map((ch, i) => [ch, i]));

export function decodeBase58(value) {
  const text = String(value || '').trim();
  if (!text) throw new Error('Empty Solana address');

  let zeros = 0;
  while (zeros < text.length && text[zeros] === '1') zeros += 1;

  const bytes = [];
  for (const ch of text) {
    const digit = BASE58_MAP.get(ch);
    if (digit == null) throw new Error('Invalid Solana address');
    let carry = digit;
    for (let i = bytes.length - 1; i >= 0; i -= 1) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.unshift(carry & 0xff);
      carry >>= 8;
    }
  }

  const out = Buffer.alloc(zeros + bytes.length);
  Buffer.from(bytes).copy(out, zeros);
  return out;
}

export function isSolanaAddress(value) {
  try {
    return decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}
