import { randomBytes } from 'node:crypto';
import { SOLANA_USDC_MINT } from './constants.js';
import { encodeBase58, isSolanaAddress } from './solanaAddress.js';

/**
 * Build a Solana Pay transfer-request URL for native USDC (SPL).
 * Spec: solana:<RECIPIENT>?amount=<N>&spl-token=<MINT>&reference=<REF>
 */
export function createSolanaPayRequest({
  recipient,
  amount,
  label = 'OpenDome',
  message,
}) {
  const to = String(recipient || '').trim();
  if (!isSolanaAddress(to)) {
    return { error: 'recipient must be a Solana address' };
  }

  const amt = String(amount ?? '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(amt) || Number(amt) <= 0) {
    return { error: 'amount must be a positive USDC value (max 6 decimals)' };
  }

  const reference = encodeBase58(randomBytes(32));
  const params = new URLSearchParams();
  params.set('amount', amt);
  params.set('spl-token', SOLANA_USDC_MINT);
  params.set('reference', reference);
  if (label) params.set('label', String(label).slice(0, 32));
  if (message) params.set('message', String(message).slice(0, 64));

  const payment_url = `solana:${to}?${params.toString()}`;
  return {
    success: true,
    payment_url,
    reference,
    recipient: to,
    amount: amt,
    splToken: SOLANA_USDC_MINT,
    label: label || null,
    message: message || null,
    note: 'Render the Solana Pay QR from payment_url. Do not paste the raw solana: URL into chat text.',
  };
}
