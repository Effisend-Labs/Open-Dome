/** Decimal USDC string ("0.48") → 6-decimal atomic units as bigint. */
export function usdcToAtomic(amount) {
  const raw = String(amount ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Invalid USDC amount');
  }
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > 6) {
    throw new Error('USDC supports at most 6 decimals');
  }
  const padded = `${frac}000000`.slice(0, 6);
  const atomic = BigInt(whole || '0') * 1_000_000n + BigInt(padded);
  if (atomic <= 0n) throw new Error('Amount must be greater than 0');
  return atomic;
}

export function atomicToUsdc(atomic) {
  const n = BigInt(atomic);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}
