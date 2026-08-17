/** Parse a decimal string into atomic units (bigint). */
export function decimalToAtomic(value, decimals) {
  const text = String(value || '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) {
    throw new Error('Amount must be a positive decimal');
  }
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places`);
  }
  const atomic = BigInt(whole) * 10n ** BigInt(decimals)
    + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (atomic <= 0n) throw new Error('Amount must be greater than zero');
  return atomic;
}

export const SOL_DECIMALS = 9;
export const USDC_DECIMALS = 6;
