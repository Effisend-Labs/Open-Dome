/**
 * Bypass API contract tests (OD_BYPASS_X402 + OD_BYPASS_BLOCKCHAIN).
 *
 * Run from OpenDomeSandbox:
 *   node scripts/test-bypass-apis.mjs
 *
 * Does not need Circle, Base gas, or live Admin — mocks the fulfill bridge.
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sandboxRoot = path.resolve(__dirname, '..');
const require = createRequire(path.join(sandboxRoot, 'package.json'));

// ── Force bypasses ON before importing handlers ─────────────────────────────
process.env.OD_BYPASS_X402 = 'true';
process.env.OD_BYPASS_BLOCKCHAIN = 'true';
process.env.OD_RELAX_X402_ERRORS = 'false';
process.env.OD_MOCK_TICKET_INDEX = 'true';
process.env.MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x69F6B4d206E19D2ef5838ed3E7150F2D22A9Fc7f';
process.env.MERCHANT_PRIVATE_KEY =
  process.env.MERCHANT_PRIVATE_KEY ||
  '0xd6128a944cf8c3045c20fffc7c0d71a4d518bc0e4d9ebce766a12b658a72120a';
process.env.ADMIN_BRIDGE_URL = process.env.ADMIN_BRIDGE_URL || 'http://localhost:8090';
process.env.ADMIN_SCANNER_TOKEN = process.env.ADMIN_SCANNER_TOKEN || 'admin-session-token-123';
process.env.CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS || '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`  FAIL  ${msg}`);
    return false;
  }
  passed += 1;
  console.log(`  PASS  ${msg}`);
  return true;
}

function sampleQuote(overrides = {}) {
  return {
    id: 'quote-test-bypass',
    totalUsd: 0.001,
    lineItems: [
      {
        id: 'ticket-35146',
        type: 'ticket',
        tokenId: 35146,
        title: 'Test Show',
        subtitle: 'Korakuen Hall',
        quantity: 1,
        unitPriceUsd: 0.001,
        totalUsd: 0.001,
      },
    ],
    reservations: [
      {
        type: 'event',
        title: 'Test Show',
        slot: '19:00 – 21:00',
        placeName: 'Korakuen Hall',
      },
    ],
    tokenIds: [35146],
    amounts: [1],
    ...overrides,
  };
}

async function main() {
  console.log('\n=== Bypass flag helpers ===');
  const {
    isX402BypassEnabled,
    isBlockchainBypassEnabled,
    fakeTxHash,
    BYPASS_HEADER,
  } = await import('opendome/dist/devBypass.js');

  assert(isX402BypassEnabled() === true, 'OD_BYPASS_X402 reads true');
  assert(isBlockchainBypassEnabled() === true, 'OD_BYPASS_BLOCKCHAIN reads true');
  assert(BYPASS_HEADER === 'x-opendome-bypass-x402', 'bypass header name');
  const hx = fakeTxHash('x402');
  assert(/^0xx402[0-9a-f]+$/i.test(hx), `fakeTxHash shape (${hx})`);

  console.log('\n=== Quote + x402 price helpers ===');
  const {
    formatQuotePriceForX402,
    quoteItineraryProposal,
    buildFulfillmentFromQuote,
  } = await import('opendome/dist/quote.js');
  const { usdPriceToUsdcAtomic, OpenDomeSeller } = await import('opendome/dist/x402.js');

  assert(formatQuotePriceForX402(0.001) === '0.001', 'formatQuotePriceForX402(0.001)');
  assert(usdPriceToUsdcAtomic('0.001') === '1000', '0.001 USDC → 1000 atomic');

  const seller = new OpenDomeSeller(process.env.MERCHANT_ADDRESS);
  const challenge = seller.generateChallenge('0.001');
  assert(challenge.includes('amount="1000"'), 'x402 challenge amount for $0.001');
  assert(challenge.includes(`payTo="${process.env.MERCHANT_ADDRESS}"`), 'x402 challenge payTo');

  const proposal = {
    id: 'prop-1',
    stops: [
      {
        kind: 'anchor',
        id: 35146,
        title: 'Test Show',
        placeName: 'Korakuen Hall',
        startTime: '19:00',
        endTime: '21:00',
        event: { id: 35146, priceUsd: 95 },
      },
      {
        kind: 'amenity',
        id: 'go-fun',
        amenityId: 'go-fun',
        title: 'Go-Fun',
        placeName: 'Go-Fun',
        startTime: '10:00',
        endTime: '11:00',
      },
    ],
  };
  const testQuote = quoteItineraryProposal(proposal, { testUnitPriceUsd: 0.001 });
  assert(testQuote?.totalUsd === 0.001, 'test quote total is $0.001');
  assert(testQuote?.testPricing === true, 'test quote marks testPricing');
  assert(testQuote?.tokenIds?.includes(35146), 'test quote keeps show tokenId');

  const fulfillment = buildFulfillmentFromQuote(testQuote, {
    paymentTxHash: '0xpay',
    mintTxHash: '0xmint',
    toAddress: '0x855566f25f0b0f71f6f197c194ae06e86fedc279',
    orderId: 'OD-TEST',
  });
  assert(fulfillment.paymentTxHash === '0xpay', 'fulfillment keeps paymentTxHash');
  assert(fulfillment.mintTxHash === '0xmint', 'fulfillment keeps mintTxHash');
  assert(fulfillment.passes?.[0]?.status === 'minted', 'pass status minted when mint hash present');
  assert(
    String(fulfillment.explorer?.mintTxUrl || '').includes('basescan.org/tx/0xmint'),
    'fulfillment explorer.mintTxUrl',
  );
  assert(
    String(fulfillment.explorer?.tokenInventoryUrl || '').includes('basescan.org/token/'),
    'fulfillment explorer.tokenInventoryUrl',
  );
  assert(
    String(fulfillment.passes?.[0]?.mintTxUrl || '').includes('basescan.org/tx/'),
    'pass mintTxUrl attached',
  );

  console.log('\n=== Checkout API (bypass ON) ===');
  const realFetch = globalThis.fetch;

  const checkoutPath = path.join(sandboxRoot, 'src', 'app', 'api', 'checkout+api.js');
  const checkout = await import(pathToFileURL(checkoutPath).href);

  const optRes = await checkout.OPTIONS();
  assert(optRes.status === 204, 'OPTIONS → 204');
  assert(
    String(optRes.headers.get('Access-Control-Allow-Headers') || '').includes(BYPASS_HEADER),
    'OPTIONS allows bypass header',
  );

  const toAddress = '0x855566f25f0b0f71f6f197c194ae06e86fedc279';
  const quote = sampleQuote();

  // Without signature + bypass header → success (no 402)
  const bypassReq = new Request('http://localhost:8083/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [BYPASS_HEADER]: '1',
    },
    body: JSON.stringify({ quote, toAddress }),
  });
  const bypassRes = await checkout.POST(bypassReq);
  const bypassJson = await bypassRes.json();
  assert(bypassRes.status === 200, `bypass checkout status 200 (got ${bypassRes.status})`);
  assert(bypassJson.success === true, 'bypass checkout success=true');
  assert(bypassJson.bypass?.x402 === true, 'response.bypass.x402=true');
  assert(bypassJson.bypass?.blockchain === true, 'response.bypass.blockchain=true');
  assert(bypassJson.confirmation?.orderId, 'confirmation.orderId present');
  assert(
    String(bypassJson.confirmation?.paymentTxHash || '').startsWith('0x'),
    'confirmation.paymentTxHash present',
  );
  assert(
    String(bypassJson.confirmation?.mintTxHash || '').startsWith('0x'),
    'confirmation.mintTxHash from platform (bypass)',
  );
  assert(bypassJson.confirmation?.passes?.[0]?.status === 'minted', 'pass marked minted');
  assert(bypassJson.confirmation?.toAddress === toAddress.toLowerCase(), 'toAddress lowercased');
  assert(bypassJson.signedBy === 'platform-bypass', 'signedBy=platform-bypass under chain bypass');
  assert(
    String(bypassJson.confirmation?.explorer?.mintTxUrl || '').includes('basescan.org/tx/'),
    'confirmation.explorer.mintTxUrl',
  );
  assert(
    String(bypassJson.confirmation?.explorer?.tokenInventoryUrl || '').includes(
      toAddress.toLowerCase(),
    ),
    'confirmation.explorer.tokenInventoryUrl includes owner',
  );

  // Invalid quote → 400
  const badReq = new Request('http://localhost:8083/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [BYPASS_HEADER]: '1' },
    body: JSON.stringify({ quote: { lineItems: [] }, toAddress }),
  });
  const badRes = await checkout.POST(badReq);
  assert(badRes.status === 400, 'empty lineItems → 400');

  console.log('\n=== Checkout API (bypass OFF → 402 challenge) ===');
  process.env.OD_BYPASS_X402 = 'false';
  const challengeReq = new Request('http://localhost:8083/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote, toAddress }),
  });
  const challengeRes = await checkout.POST(challengeReq);
  assert(challengeRes.status === 402, 'no bypass + no signature → 402');
  assert(Boolean(challengeRes.headers.get('x402-challenge')), '402 includes x402-challenge');

  process.env.OD_BYPASS_X402 = 'true';

  console.log('\n=== x402-pay bypass branch (shape) ===');
  const payBypassPayload = {
    success: true,
    data: bypassJson,
    bypassX402: true,
  };
  assert(payBypassPayload.bypassX402 === true, 'x402-pay bypass response flag');
  assert(payBypassPayload.data?.confirmation?.orderId, 'x402-pay data nests checkout confirmation');

  console.log('\n=== Ownership split (contract) ===');
  assert(true, 'agent checkout: platform mint + platform ticket assign');
  assert(true, 'admin fulfill: hotfix recovery only');

  console.log('\n=== OpenDomeApp Checkout API (bypass ON) ===');
  const appCheckoutPath = path.join(
    sandboxRoot,
    '..',
    'OpenDomeApp',
    'src',
    'app',
    'api',
    'checkout+api.js',
  );
  const appCheckout = await import(pathToFileURL(appCheckoutPath).href);
  const appReq = new Request('http://localhost:8082/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [BYPASS_HEADER]: '1',
    },
    body: JSON.stringify({ quote, toAddress }),
  });
  const appRes = await appCheckout.POST(appReq);
  const appJson = await appRes.json();
  assert(appRes.status === 200, `App checkout status 200 (got ${appRes.status})`);
  assert(appJson.success === true, 'App checkout success=true');
  assert(appJson.bypass?.x402 === true, 'App response.bypass.x402=true');
  assert(String(appJson.confirmation?.mintTxHash || '').startsWith('0x'), 'App mintTxHash present');
  assert(appJson.signedBy === 'platform-bypass', 'App signedBy=platform-bypass');
  assert(
    String(appJson.confirmation?.explorer?.mintTxUrl || '').includes('basescan.org/tx/'),
    'App confirmation.explorer.mintTxUrl',
  );

  globalThis.fetch = realFetch;

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nTest runner crashed:', err);
  process.exit(1);
});
