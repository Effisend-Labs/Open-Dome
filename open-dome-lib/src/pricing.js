import pricingCatalog from './dbs/pricing.json';

const byRef = new Map();
const byPricingId = new Map();

for (const item of pricingCatalog.items || []) {
  byPricingId.set(item.id, item);
  byRef.set(`${item.refType}:${item.refId}`, item);
}

/**
 * Look up catalog price by source DB type + id.
 * @param {'amenity'|'event'} refType
 * @param {string|number} refId
 * @returns {number|null} priceUsd or null if not ticketed/priced
 */
export function getCatalogPriceUsd(refType, refId) {
  const item = byRef.get(`${refType}:${refId}`);
  return item != null ? Number(item.priceUsd) : null;
}

export function getPricingItem(refType, refId) {
  return byRef.get(`${refType}:${refId}`) || null;
}

export function getPricingById(pricingId) {
  return byPricingId.get(pricingId) || null;
}

export function listPricingItems(filter = {}) {
  let items = pricingCatalog.items || [];
  if (filter.refType) items = items.filter((i) => i.refType === filter.refType);
  return items;
}

export const PRICING_CATALOG_META = {
  version: pricingCatalog.version,
  currency: pricingCatalog.currency,
  updatedAt: pricingCatalog.updatedAt,
  count: (pricingCatalog.items || []).length,
};
