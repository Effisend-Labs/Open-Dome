/**
 * Prefer api/vendor (shipped via includeFiles), then node_modules.
 * Cache on globalThis for Metro-bundled API routes (merchant balances, mint).
 */
const path = require('path');
const { createRequire } = require('module');

function load(id) {
  const vendorPkg = path.join(__dirname, 'vendor', 'package.json');
  try {
    return createRequire(vendorPkg)(id);
  } catch {
    return require(id);
  }
}

const mod = load('ethers');
const g = globalThis;
g.__OPENDOME_NATIVE__ = g.__OPENDOME_NATIVE__ || {};
g.__OPENDOME_NATIVE__.ethers = mod;
module.exports = mod;
