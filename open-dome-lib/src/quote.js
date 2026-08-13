import amenitiesData from './dbs/amenities.json';
import { getCatalogPriceUsd } from './pricing';
import { attachExplorerToPass, buildPassExplorerLinks } from './explorer';
import { OPENDOME_PASS_ADDRESS } from './blockchain/passContract.js';

const AMENITY_TOKEN_BASE = 900000;

export function amenityPassTokenId(amenityId) {
  const row = amenitiesData.find((a) => a.id === amenityId);
  if (row?.tokenId != null) return Number(row.tokenId);

  let h = 2166136261;
  const s = String(amenityId || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AMENITY_TOKEN_BASE + ((h >>> 0) % 99999) + 1;
}

const DEFAULT_TICKET_USD = 48;
const DEFAULT_AMENITY_USD = 20;

/** Demo settlement only — UI still shows catalog prices. */
export const DEMO_SETTLEMENT_USD_PER_NFT = 0.02;

export function countQuoteNfts(quote) {
  const amounts = quote?.amounts;
  if (Array.isArray(amounts) && amounts.length) {
    return amounts.reduce((sum, n) => sum + (Number(n) || 0), 0);
  }
  return Array.isArray(quote?.lineItems) ? quote.lineItems.length : 0;
}

/** USDC the backend actually charges (not the catalog total shown in UI). */
export function settlementUsdForQuote(quote) {
  const n = countQuoteNfts(quote);
  return Math.max(n, 1) * DEMO_SETTLEMENT_USD_PER_NFT;
}

function amenityPrice(amenityId) {
  return getCatalogPriceUsd('amenity', amenityId) ?? DEFAULT_AMENITY_USD;
}

function eventTicketPrice(stop) {
  const eventId = stop.event?.id ?? stop.id;
  const fromCatalog = getCatalogPriceUsd('event', eventId);
  if (fromCatalog != null) return fromCatalog;
  return stop.event?.priceUsd ?? DEFAULT_TICKET_USD;
}

function formatUsd(amount) {
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

/** Serialize quote total for x402 (keeps sub-cent precision). */
export function formatQuotePriceForX402(totalUsd) {
  const n = Number(totalUsd);
  if (!Number.isFinite(n) || n <= 0) return '0.001';
  if (n < 0.01) {
    const s = n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    return s || '0.001';
  }
  return n.toFixed(2);
}

/**
 * Build a checkout quote from an itinerary proposal.
 * Line items / totals are catalog prices for the UI.
 * Backend x402 uses settlementUsdForQuote() ($0.02 per NFT).
 * @param {Object} proposal
 * @returns {Object|null}
 */
export function quoteItineraryProposal(proposal) {
  if (!proposal?.stops?.length) return null;

  const lineItems = [];
  const reservations = [];
  const tokenIds = [];
  const amounts = [];

  for (const stop of proposal.stops) {
    if (stop.enabled === false) continue;

    if (stop.kind === 'anchor') {
      const price = eventTicketPrice(stop);
      lineItems.push({
        id: `ticket-${stop.id}`,
        type: 'ticket',
        tokenId: Number(stop.id),
        title: stop.title,
        subtitle: `${stop.placeName} · ${stop.startTime}`,
        quantity: 1,
        unitPriceUsd: price,
        totalUsd: price,
      });
      tokenIds.push(Number(stop.id));
      amounts.push(1);
      reservations.push({
        type: 'event',
        title: stop.title,
        slot: `${stop.startTime} – ${stop.endTime}`,
        placeName: stop.placeName,
      });
      continue;
    }

    const amenityId = stop.amenityId || stop.id;
    const price = amenityPrice(amenityId);
    const tokenId = amenityPassTokenId(amenityId);
    lineItems.push({
      id: `amenity-${amenityId}`,
      type: 'amenity',
      amenityId,
      tokenId,
      title: stop.title,
      subtitle: `${stop.startTime} – ${stop.endTime} · ${stop.placeName}`,
      quantity: 1,
      unitPriceUsd: price,
      totalUsd: price,
    });
    tokenIds.push(tokenId);
    amounts.push(1);
    reservations.push({
      type: 'amenity',
      title: stop.title,
      slot: `${stop.startTime} – ${stop.endTime}`,
      placeName: stop.placeName,
    });
  }

  const totalUsd = lineItems.reduce((sum, item) => sum + item.totalUsd, 0);
  if (!lineItems.length) return null;

  return {
    id: `quote-${proposal.id}-${Date.now()}`,
    proposalId: proposal.id,
    status: 'quote',
    currency: 'USDC',
    lineItems,
    reservations,
    tokenIds,
    amounts,
    totalUsd,
    totalLabel: formatUsd(totalUsd),
    createdAt: Date.now(),
  };
}

export function buildFulfillmentFromQuote(quote, {
  paymentTxHash,
  mintTxHash,
  mintResult,
  toAddress,
  orderId,
  contractAddress,
} = {}) {
  const resolvedMintTx = mintTxHash || mintResult?.txHash || null;
  const hasMint = Boolean(resolvedMintTx);
  const contract = contractAddress || mintResult?.contractAddress || OPENDOME_PASS_ADDRESS;
  const explorer = buildPassExplorerLinks({
    toAddress,
    mintTxHash: resolvedMintTx,
    paymentTxHash,
    contractAddress: contract,
  });

  return {
    orderId: orderId || `OD-${Date.now().toString(36).toUpperCase()}`,
    quoteId: quote.id,
    totalUsd: quote.totalUsd,
    paymentTxHash: paymentTxHash || null,
    mintTxHash: resolvedMintTx,
    txHash: resolvedMintTx || paymentTxHash || null,
    toAddress,
    contractAddress: contract,
    explorer,
    reservations: (quote.reservations || []).map((r) => ({
      ...r,
      status: 'confirmed',
    })),
    passes: (quote.tokenIds || []).map((id, i) =>
      attachExplorerToPass(
        {
          tokenId: id,
          amount: quote.amounts?.[i] ?? 1,
          status: hasMint ? 'minted' : 'pending',
          mintTxHash: resolvedMintTx,
          paymentTxHash: paymentTxHash || null,
          contractAddress: contract,
          toAddress,
        },
        { toAddress, mintTxHash: resolvedMintTx, paymentTxHash, contractAddress: contract },
      ),
    ),
    mintedAt: hasMint ? Date.now() : null,
  };
}

/** Call Admin bridge to mint passes after checkout payment. */
export async function fulfillPassesViaAdminBridge({
  bridgeUrl,
  serviceToken,
  to,
  quote,
  paymentTxHash,
  orderId,
}) {
  if (!quote?.tokenIds?.length) {
    return { skipped: true };
  }

  const base = String(bridgeUrl || 'http://localhost:8090').replace(/\/$/, '');
  const res = await fetch(`${base}/api/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify({
      to,
      ids: quote.tokenIds,
      amounts: quote.amounts,
      network: 'base',
      orderId,
      paymentTxHash,
      quoteId: quote.id,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Fulfillment failed (${res.status})`);
  }
  return data;
}
