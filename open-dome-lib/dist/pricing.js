"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PRICING_CATALOG_META = void 0;
exports.getCatalogPriceUsd = getCatalogPriceUsd;
exports.getPricingById = getPricingById;
exports.getPricingItem = getPricingItem;
exports.listPricingItems = listPricingItems;
var _pricing = _interopRequireDefault(require("./dbs/pricing.json"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const byRef = new Map();
const byPricingId = new Map();
for (const item of _pricing.default.items || []) {
  byPricingId.set(item.id, item);
  byRef.set(`${item.refType}:${item.refId}`, item);
}

/**
 * Look up catalog price by source DB type + id.
 * @param {'amenity'|'event'} refType
 * @param {string|number} refId
 * @returns {number|null} priceUsd or null if not ticketed/priced
 */
function getCatalogPriceUsd(refType, refId) {
  const item = byRef.get(`${refType}:${refId}`);
  return item != null ? Number(item.priceUsd) : null;
}
function getPricingItem(refType, refId) {
  return byRef.get(`${refType}:${refId}`) || null;
}
function getPricingById(pricingId) {
  return byPricingId.get(pricingId) || null;
}
function listPricingItems(filter = {}) {
  let items = _pricing.default.items || [];
  if (filter.refType) items = items.filter(i => i.refType === filter.refType);
  return items;
}
const PRICING_CATALOG_META = exports.PRICING_CATALOG_META = {
  version: _pricing.default.version,
  currency: _pricing.default.currency,
  updatedAt: _pricing.default.updatedAt,
  count: (_pricing.default.items || []).length
};