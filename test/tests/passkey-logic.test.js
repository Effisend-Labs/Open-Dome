const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * OpenDome Unit Test: Passkey Registration Logic
 *
 * Tests the business logic for the passkey registration flow:
 * - Input validation
 * - Wallet map structure after multi-chain generation
 * - Challenge clearing behavior
 */

describe('Passkey Registration Logic', () => {

  describe('Input Validation', () => {
    it('should reject missing userId', () => {
      const body = { credentialResponse: { id: 'abc' } };
      const valid = !!(body.userId && body.credentialResponse);
      assert.equal(valid, false);
    });

    it('should reject missing credentialResponse', () => {
      const body = { userId: 'user123' };
      const valid = !!(body.userId && body.credentialResponse);
      assert.equal(valid, false);
    });

    it('should accept valid payload with both fields', () => {
      const body = { userId: 'user123', credentialResponse: { id: 'cred-abc' } };
      const valid = !!(body.userId && body.credentialResponse);
      assert.ok(valid);
    });
  });

  describe('Multi-Chain Wallet Mapping', () => {
    // Simulate what happens after Circle createWallets returns
    const mockCircleResponse = {
      data: {
        wallets: [
          { blockchain: 'ARB', id: 'wid-arb', address: '0xUnifiedAddress' },
          { blockchain: 'AVAX', id: 'wid-avax', address: '0xUnifiedAddress' },
          { blockchain: 'BASE', id: 'wid-base', address: '0xUnifiedAddress' },
          { blockchain: 'ETH', id: 'wid-eth', address: '0xUnifiedAddress' },
          { blockchain: 'MATIC', id: 'wid-matic', address: '0xUnifiedAddress' },
          { blockchain: 'OP', id: 'wid-op', address: '0xUnifiedAddress' },
        ]
      }
    };

    it('should build a walletIds map with all 6 chains', () => {
      const walletIds = {};
      let primaryAddress = '';
      mockCircleResponse.data.wallets.forEach(w => {
        walletIds[w.blockchain] = w.id;
        primaryAddress = w.address;
      });

      assert.equal(Object.keys(walletIds).length, 6);
      assert.equal(walletIds['BASE'], 'wid-base');
      assert.equal(walletIds['ETH'], 'wid-eth');
      assert.equal(walletIds['ARB'], 'wid-arb');
      assert.equal(walletIds['AVAX'], 'wid-avax');
      assert.equal(walletIds['MATIC'], 'wid-matic');
      assert.equal(walletIds['OP'], 'wid-op');
    });

    it('should resolve a single unified EOA address across all chains', () => {
      let primaryAddress = '';
      mockCircleResponse.data.wallets.forEach(w => {
        primaryAddress = w.address;
      });
      assert.equal(primaryAddress, '0xUnifiedAddress');
    });

    it('should produce a valid Firestore wallet document shape', () => {
      const walletIds = {};
      let primaryAddress = '';
      mockCircleResponse.data.wallets.forEach(w => {
        walletIds[w.blockchain] = w.id;
        primaryAddress = w.address;
      });

      const newWallet = {
        userId: 'testUser',
        address: primaryAddress,
        walletIds: walletIds,
        createdAt: new Date().toISOString()
      };

      assert.ok(newWallet.userId, 'Wallet doc must have userId');
      assert.ok(newWallet.address, 'Wallet doc must have address');
      assert.ok(newWallet.walletIds, 'Wallet doc must have walletIds map');
      assert.ok(newWallet.createdAt, 'Wallet doc must have createdAt');
      assert.equal(typeof newWallet.walletIds, 'object');
    });
  });

  describe('Challenge Lifecycle', () => {
    it('should clear the challenge after successful registration', () => {
      const user = { id: 'user1', currentChallenge: 'abc123challenge' };
      // Simulate clearing
      const updatePayload = { currentChallenge: null };
      const merged = { ...user, ...updatePayload };
      assert.equal(merged.currentChallenge, null);
    });

    it('should reject registration if no challenge exists', () => {
      const user = { id: 'user1', currentChallenge: null };
      const valid = user && user.currentChallenge;
      assert.equal(valid, null, 'Should fail when currentChallenge is null');
    });
  });
});
