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
 * @param {Object} proposal
 * @param {{ testUnitPriceUsd?: number }} [options] — dev-only: e.g. 0.001 per pass/NFT line
 * @returns {Object|null}
 */
export function quoteItineraryProposal(proposal, options = {}) {
  if (!proposal?.stops?.length) return null;

  const testUnit = options.testUnitPriceUsd;
  const testPricing = testUnit != null && testUnit > 0;

  const lineItems = [];
  const reservations = [];
  const tokenIds = [];
  const amounts = [];

  for (const stop of proposal.stops) {
    if (stop.kind === 'anchor') {
      let price = eventTicketPrice(stop);
      if (testPricing) price = testUnit;
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
    let price = amenityPrice(amenityId);
    if (testPricing) price = testUnit;
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
    testPricing,
    testUnitPriceUsd: testPricing ? testUnit : undefined,
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
  bypassBlockchain = false,
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
      bypassBlockchain,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Fulfillment failed (${res.status})`);
  }
  return data;
}
