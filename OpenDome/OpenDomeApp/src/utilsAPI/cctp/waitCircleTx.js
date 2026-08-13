const DONE = new Set(['COMPLETE', 'FAILED', 'DENIED', 'CANCELLED']);
const FAILED = new Set(['FAILED', 'DENIED', 'CANCELLED']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForCircleTx(client, transactionId, { timeoutMs = 120_000 } = {}) {
  if (!transactionId) throw new Error('Circle did not return a transaction id');
  const started = Date.now();
  let last = null;

  while (Date.now() - started < timeoutMs) {
    const res = await client.getTransaction({ id: transactionId });
    last = res.data?.transaction || res.data;
    const state = String(last?.state || '').toUpperCase();
    const txHash = last?.txHash || last?.transactionHash || null;
    if (txHash && !last.txHash) last.txHash = txHash;
    if (FAILED.has(state)) {
      throw new Error(last?.errorReason || last?.errorDetails || `Circle tx ${state}`);
    }
    if (DONE.has(state) && txHash) return last;
    await sleep(1500);
  }

  if (last?.txHash) return last;
  throw new Error('Timed out waiting for Circle to confirm the Base transaction');
}
