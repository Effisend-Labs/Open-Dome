const ADDR = /0x[a-fA-F0-9]{40}(?![a-fA-F0-9])/;

/** Pull a single Ethereum address out of QR/paste text. Rejects Solana, URLs, etc. */
export function parseEthereumAddress(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const eip681 = text.match(/^(?:ethereum:)?(?:pay-)?(0x[a-fA-F0-9]{40})(?:[@/?#]|$)/i);
  if (eip681) return `0x${eip681[1].slice(2)}`;

  const matches = text.match(new RegExp(ADDR, 'g'));
  if (matches?.length === 1) return matches[0];
  return null;
}

export function isEthereumAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ''));
}

/** Typing/paste: keep 0x + hex only, or extract a full address from junk. */
export function sanitizeEthereumAddressInput(raw) {
  const extracted = parseEthereumAddress(raw);
  if (extracted) return extracted;

  let out = '';
  for (const ch of String(raw || '')) {
    if (!out && ch === '0') {
      out = '0';
      continue;
    }
    if (out === '0' && (ch === 'x' || ch === 'X')) {
      out = '0x';
      continue;
    }
    if (out.startsWith('0x') && /[a-fA-F0-9]/.test(ch)) {
      if (out.length >= 42) continue;
      out += ch;
    }
  }
  return out;
}
