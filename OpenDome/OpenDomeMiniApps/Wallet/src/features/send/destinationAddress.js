import {
  isEthereumAddress,
  parseEthereumAddress,
  sanitizeEthereumAddressInput,
} from './ethereumAddress';
import {
  isSolanaAddress,
  parseSolanaAddress,
  sanitizeSolanaAddressInput,
} from './solanaAddress';

export function parseDestinationAddress(raw) {
  return parseEthereumAddress(raw) || parseSolanaAddress(raw);
}

export function isDestinationAddress(value) {
  return isEthereumAddress(value) || isSolanaAddress(value);
}

export function destinationChain(value) {
  if (isSolanaAddress(value)) return 'solana';
  if (isEthereumAddress(value)) return 'base';
  return null;
}

export function sanitizeDestinationInput(raw) {
  const extracted = parseDestinationAddress(raw);
  if (extracted) return extracted;
  const text = String(raw || '');
  if (text.startsWith('0') || text.startsWith('0x') || text.startsWith('0X')) {
    return sanitizeEthereumAddressInput(text);
  }
  return sanitizeSolanaAddressInput(text);
}
