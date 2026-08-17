import {
  createKeyPairSignerFromBytes,
  getBase58Encoder,
} from '@solana/kit';

/** Decode a 64-byte Solana keypair secret from JSON array or base58. */
export function parseSecretKeyBytes(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    throw new Error('Solana secret key is required');
  }

  let bytes;
  if (value.startsWith('[')) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('Invalid Solana secret key JSON');
    bytes = Uint8Array.from(parsed);
  } else {
    bytes = getBase58Encoder().encode(value);
  }

  if (bytes.length !== 64) {
    throw new Error('Solana secret key must decode to 64 bytes');
  }
  return bytes;
}

/** Build a Kit keypair signer from a raw secret (64-byte keypair material). */
export async function createSignerFromSecretKey(raw) {
  return createKeyPairSignerFromBytes(parseSecretKeyBytes(raw));
}
