"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEMO_SETTLEMENT_USD_PER_NFT = void 0;
exports.amenityPassTokenId = amenityPassTokenId;
exports.buildFulfillmentFromQuote = buildFulfillmentFromQuote;
exports.countQuoteNfts = countQuoteNfts;
exports.formatQuotePriceForX402 = formatQuotePriceForX402;
exports.fulfillPassesViaAdminBridge = fulfillPassesViaAdminBridge;
exports.quoteItineraryProposal = quoteItineraryProposal;
exports.settlementUsdForQuote = settlementUsdForQuote;
var _amenities = _interopRequireDefault(require("./dbs/amenities.json"));
var _pricing = require("./pricing");
var _explorer = require("./explorer");
var _passContract = require("./blockchain/passContract.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const AMENITY_TOKEN_BASE = 900000;
function amenityPassTokenId(amenityId) {
  const row = _amenities.default.find(a => a.id === amenityId);
  if (row?.tokenId != null) return Number(row.tokenId);
  let h = 2166136261;
  const s = String(amenityId || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AMENITY_TOKEN_BASE + (h >>> 0) % 99999 + 1;
}
const DEFAULT_TICKET_USD = 48;
const DEFAULT_AMENITY_USD = 20;

/** Demo settlement only — UI still shows catalog prices. */
const DEMO_SETTLEMENT_USD_PER_NFT = exports.DEMO_SETTLEMENT_USD_PER_NFT = 0.02;
function countQuoteNfts(quote) {
  const amounts = quote?.amounts;
  if (Array.isArray(amounts) && amounts.length) {
    return amounts.reduce((sum, n) => sum + (Number(n) || 0), 0);
  }
  return Array.isArray(quote?.lineItems) ? quote.lineItems.length : 0;
}

/** USDC the backend actually charges (not the catalog total shown in UI). */
function settlementUsdForQuote(quote) {
  const n = countQuoteNfts(quote);
  return Math.max(n, 1) * DEMO_SETTLEMENT_USD_PER_NFT;
}
function amenityPrice(amenityId) {
  return (0, _pricing.getCatalogPriceUsd)('amenity', amenityId) ?? DEFAULT_AMENITY_USD;
}
function eventTicketPrice(stop) {
  const eventId = stop.event?.id ?? stop.id;
  const fromCatalog = (0, _pricing.getCatalogPriceUsd)('event', eventId);
  if (fromCatalog != null) return fromCatalog;
  return stop.event?.priceUsd ?? DEFAULT_TICKET_USD;
}
function formatUsd(amount) {
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

/** Serialize quote total for x402 (keeps sub-cent precision). */
function formatQuotePriceForX402(totalUsd) {
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
function quoteItineraryProposal(proposal) {
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
        totalUsd: price
      });
      tokenIds.push(Number(stop.id));
      amounts.push(1);
      reservations.push({
        type: 'event',
        title: stop.title,
        slot: `${stop.startTime} – ${stop.endTime}`,
        placeName: stop.placeName
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
      totalUsd: price
    });
    tokenIds.push(tokenId);
    amounts.push(1);
    reservations.push({
      type: 'amenity',
      title: stop.title,
      slot: `${stop.startTime} – ${stop.endTime}`,
      placeName: stop.placeName
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
    createdAt: Date.now()
  };
}
function buildFulfillmentFromQuote(quote, {
  paymentTxHash,
  mintTxHash,
  mintResult,
  toAddress,
  orderId,
  contractAddress
} = {}) {
  const resolvedMintTx = mintTxHash || mintResult?.txHash || null;
  const hasMint = Boolean(resolvedMintTx);
  const contract = contractAddress || mintResult?.contractAddress || _passContract.OPENDOME_PASS_ADDRESS;
  const explorer = (0, _explorer.buildPassExplorerLinks)({
    toAddress,
    mintTxHash: resolvedMintTx,
    paymentTxHash,
    contractAddress: contract
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
    reservations: (quote.reservations || []).map(r => ({
      ...r,
      status: 'confirmed'
    })),
    passes: (quote.tokenIds || []).map((id, i) => (0, _explorer.attachExplorerToPass)({
      tokenId: id,
      amount: quote.amounts?.[i] ?? 1,
      status: hasMint ? 'minted' : 'pending',
      mintTxHash: resolvedMintTx,
      paymentTxHash: paymentTxHash || null,
      contractAddress: contract,
      toAddress
    }, {
      toAddress,
      mintTxHash: resolvedMintTx,
      paymentTxHash,
      contractAddress: contract
    })),
    mintedAt: hasMint ? Date.now() : null
  };
}

/** Call Admin bridge to mint passes after checkout payment. */
async function fulfillPassesViaAdminBridge({
  bridgeUrl,
  serviceToken,
  to,
  quote,
  paymentTxHash,
  orderId
}) {
  if (!quote?.tokenIds?.length) {
    return {
      skipped: true
    };
  }
  const base = String(bridgeUrl || 'http://localhost:8090').replace(/\/$/, '');
  const res = await fetch(`${base}/api/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      to,
      ids: quote.tokenIds,
      amounts: quote.amounts,
      network: 'base',
      orderId,
      paymentTxHash,
      quoteId: quote.id
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Fulfillment failed (${res.status})`);
  }
  return data;
}