/**
 * Admin mint client — does NOT hold MERCHANT_PRIVATE_KEY.
 * Forwards to OpenDomeApp /api/mint with the caller's god JWT (or scanner token for hotfix).
 */

import { getOpenDomeAppUrl } from './runtimeEnv';

function normalizeIdsAmounts({ ids, amounts, tokenId, amount }) {
  const resolvedIds =
    Array.isArray(ids) && ids.length
      ? ids
      : tokenId != null
        ? [tokenId]
        : null;
  const resolvedAmounts =
    Array.isArray(amounts) && amounts.length
      ? amounts
      : [amount != null ? amount : 1];

  if (!resolvedIds?.length) {
    const err = new Error('ids or tokenId is required');
    err.status = 400;
    throw err;
  }
  if (resolvedIds.length !== resolvedAmounts.length) {
    const err = new Error('ids and amounts length mismatch');
    err.status = 400;
    throw err;
  }
  return { ids: resolvedIds, amounts: resolvedAmounts };
}

export function readAuthToken(request) {
  const auth =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  const alt =
    request.headers.get('x-opendome-jwt') ||
    request.headers.get('X-OpenDome-Jwt') ||
    '';
  return alt.trim() || null;
}

/**
 * Mint via OpenDomeApp platform merchant key.
 */
export async function mintPassesToAddress({
  authToken,
  to,
  ids,
  amounts,
  tokenId,
  amount,
  network = 'base',
  contractAddress,
  paymentTxHash = null,
} = {}) {
  if (!to) {
    const err = new Error('to (recipient address) is required');
    err.status = 400;
    throw err;
  }
  if (!authToken) {
    const err = new Error(
      'Host JWT required — Admin mints through OpenDomeApp, not a local merchant key',
    );
    err.status = 401;
    throw err;
  }

  const { ids: resolvedIds, amounts: resolvedAmounts } = normalizeIdsAmounts({
    ids,
    amounts,
    tokenId,
    amount,
  });

  const base = getOpenDomeAppUrl();
  const res = await fetch(`${base}/api/mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      to,
      ids: resolvedIds,
      amounts: resolvedAmounts,
      network: network || 'base',
      contractAddress,
      paymentTxHash,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      data.error || data.message || `OpenDomeApp mint failed (${res.status})`,
    );
    err.status = res.status >= 400 ? res.status : 500;
    throw err;
  }

  return {
    success: true,
    txHash: data.txHash,
    contractAddress: data.contractAddress,
    to: data.to || to,
    ids: data.ids || resolvedIds,
    amounts: data.amounts || resolvedAmounts,
    network: data.network || String(network || 'base').toLowerCase(),
    explorer: data.explorer || null,
    signedBy: data.signedBy || 'opendomeapp',
  };
}

/**
 * Mint the same ticket set to many recipients (Admin batch assign).
 * Stops on first failure.
 */
export async function mintPassesToAddresses(
  targets,
  ticketIds,
  amounts,
  network = 'base',
  authToken,
) {
  if (!targets?.length) {
    const err = new Error('No mint targets');
    err.status = 400;
    throw err;
  }
  if (!ticketIds?.length || !amounts?.length) {
    const err = new Error('ticketIds and amounts are required');
    err.status = 400;
    throw err;
  }
  if (!authToken) {
    const err = new Error(
      'Host JWT required — Admin mints through OpenDomeApp, not a local merchant key',
    );
    err.status = 401;
    throw err;
  }

  const results = [];
  for (const target of targets) {
    const minted = await mintPassesToAddress({
      authToken,
      to: target.address,
      ids: ticketIds,
      amounts,
      network,
    });
    results.push({
      userId: target.passkeyUserId || target.userId || null,
      address: target.address,
      txHash: minted.txHash,
    });
  }
  return results;
}
