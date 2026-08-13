import { amenityPassTokenId } from 'opendome/dist/quote.js';

/** Every quote line becomes an ERC-1155 id — events and amenities. */
export function mintPlanFromQuote(quote) {
  const ids = [];
  const amounts = [];

  for (const item of quote?.lineItems || []) {
    let tokenId = item.tokenId;
    if (tokenId == null && (item.type === 'amenity' || item.amenityId)) {
      tokenId = amenityPassTokenId(item.amenityId);
    }
    if (tokenId == null && item.type === 'ticket') {
      const match = String(item.id || '').match(/^ticket-(.+)$/);
      if (match) tokenId = Number(match[1]);
    }
    if (tokenId == null) continue;
    ids.push(tokenId);
    amounts.push(item.quantity || 1);
  }

  if (ids.length) return { ids, amounts };

  return {
    ids: quote?.tokenIds || [],
    amounts: quote?.amounts || (quote?.tokenIds || []).map(() => 1),
  };
}
