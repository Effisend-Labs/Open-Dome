import { IRIS_MESSAGES_URL } from './constants.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Best-effort: Forwarding Service mint hash on Solana. Does not throw. */
export async function waitForSolanaMint(burnTxHash, { timeoutMs = 90_000 } = {}) {
  if (!burnTxHash) return null;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(
        `${IRIS_MESSAGES_URL}?transactionHash=${encodeURIComponent(burnTxHash)}`,
      );
      const data = await res.json().catch(() => ({}));
      const mint = data.messages?.[0]?.forwardTxHash || null;
      if (mint) return mint;
    } catch {
      // keep polling
    }
    await sleep(2500);
  }
  return null;
}
