import { createHmac, timingSafeEqual } from 'node:crypto';

function secret() {
  const value = process.env.OPENDOME_SECRET || process.env.JWT_SECRET;
  if (!value) throw new Error('OPENDOME_SECRET is required for Solana payment proofs');
  return value;
}

function message({ amount, payTo, transactionId }) {
  return ['SOL', String(amount), String(payTo), String(transactionId)].join(':');
}

export function signSolanaPaymentProof(payment) {
  return createHmac('sha256', secret()).update(message(payment)).digest('hex');
}

export function verifySolanaPaymentProof(payment) {
  const proof = String(payment?.proof || '');
  if (!/^[a-f0-9]{64}$/i.test(proof)) return false;
  const expected = signSolanaPaymentProof(payment);
  return timingSafeEqual(Buffer.from(proof, 'hex'), Buffer.from(expected, 'hex'));
}
