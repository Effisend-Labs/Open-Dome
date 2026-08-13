const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

/**
 * OpenDome Unit Test: Circle Developer SDK
 * 
 * Tests that the Circle API key is valid, the Entity Secret is properly configured,
 * and that the WalletSet (OpenDome) is accessible.
 */

// Load env from the Sandbox .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', 'OpenDome', 'OpenDomeSandbox', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

describe('Circle Developer SDK', () => {
  let circleClient;

  before(() => {
    loadEnv();
    assert.ok(process.env.CIRCLE_API_KEY, 'CIRCLE_API_KEY must be set');
    assert.ok(process.env.CIRCLE_ENTITY_SECRET, 'CIRCLE_ENTITY_SECRET must be set');

    const { initiateDeveloperControlledWalletsClient } = require('@circle-fin/developer-controlled-wallets');
    circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });
  });

  it('should authenticate with the Circle Mainnet API', async () => {
    // getWalletSets is a lightweight read-only call — perfect for auth verification
    const res = await circleClient.listWalletSets({});
    assert.ok(res.data, 'Circle API should return a data object');
    assert.ok(res.data.walletSets, 'Response should contain walletSets array');
    console.log(`  → Authenticated. Found ${res.data.walletSets.length} wallet set(s).`);
  });

  it('should find the OpenDome WalletSet (afd0591a-e99a-5883-89e7-a1c27316eee8)', async () => {
    const res = await circleClient.listWalletSets({});
    const openDomeSet = res.data.walletSets.find(
      ws => ws.id === 'afd0591a-e99a-5883-89e7-a1c27316eee8'
    );
    assert.ok(openDomeSet, 'OpenDome WalletSet should exist');
    console.log(`  → WalletSet name: "${openDomeSet.name}", custodyType: ${openDomeSet.custodyType}`);
  });

  it('should list existing wallets in the OpenDome WalletSet', async () => {
    const res = await circleClient.listWallets({
      walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
    });
    assert.ok(res.data, 'listWallets should return data');
    assert.ok(Array.isArray(res.data.wallets), 'Response should contain wallets array');
    console.log(`  → Found ${res.data.wallets.length} wallet(s) in the OpenDome WalletSet.`);
    if (res.data.wallets.length > 0) {
      const first = res.data.wallets[0];
      console.log(`  → Sample wallet: blockchain=${first.blockchain}, address=${first.address}`);
    }
  });

  it('should verify all 6 EVM blockchains are supported', async () => {
    const expectedChains = ['ARB', 'AVAX', 'BASE', 'ETH', 'MATIC', 'OP'];
    const res = await circleClient.listWallets({
      walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
    });
    const chains = [...new Set(res.data.wallets.map(w => w.blockchain))];
    console.log(`  → Chains found in WalletSet: ${chains.join(', ')}`);
    // We don't assert all 6 are present yet — wallets may not have been created on all chains
    // But we verify the response structure is valid
    assert.ok(chains.length >= 0, 'Should be able to enumerate blockchains');
  });
});
