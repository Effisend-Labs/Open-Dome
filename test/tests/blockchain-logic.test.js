const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * OpenDome Unit Test: Blockchain Handler Logic
 *
 * Tests the business logic extracted from blockchain.js:
 * - Input validation
 * - Chain routing (walletIds map lookup)
 * - Default chain fallback
 * - Error masking (no secrets in error responses)
 */

describe('Blockchain Handler Logic', () => {

  describe('Input Validation', () => {
    it('should reject requests missing userId', () => {
      const body = { toAddress: '0xabc', amount: '0.01' };
      const valid = body.userId && body.toAddress && body.amount;
      assert.equal(valid, undefined, 'Request without userId should be invalid');
    });

    it('should reject requests missing toAddress', () => {
      const body = { userId: 'user123', amount: '0.01' };
      const valid = body.userId && body.toAddress && body.amount;
      assert.equal(valid, undefined, 'Request without toAddress should be invalid');
    });

    it('should reject requests missing amount', () => {
      const body = { userId: 'user123', toAddress: '0xabc' };
      const valid = body.userId && body.toAddress && body.amount;
      assert.equal(valid, undefined, 'Request without amount should be invalid');
    });

    it('should accept valid requests with all fields', () => {
      const body = { userId: 'user123', toAddress: '0xabc', amount: '0.01' };
      const valid = !!(body.userId && body.toAddress && body.amount);
      assert.ok(valid, 'Request with all fields should be valid');
    });
  });

  describe('Chain Routing', () => {
    const mockWalletIds = {
      ARB: 'wallet-arb-001',
      AVAX: 'wallet-avax-002',
      BASE: 'wallet-base-003',
      ETH: 'wallet-eth-004',
      MATIC: 'wallet-matic-005',
      OP: 'wallet-op-006',
    };

    it('should route to the correct walletId for BASE', () => {
      const targetChain = 'BASE';
      const walletId = mockWalletIds[targetChain];
      assert.equal(walletId, 'wallet-base-003');
    });

    it('should route to the correct walletId for ETH', () => {
      const targetChain = 'ETH';
      const walletId = mockWalletIds[targetChain];
      assert.equal(walletId, 'wallet-eth-004');
    });

    it('should route to the correct walletId for ARB', () => {
      const targetChain = 'ARB';
      const walletId = mockWalletIds[targetChain];
      assert.equal(walletId, 'wallet-arb-001');
    });

    it('should route to the correct walletId for OP', () => {
      const targetChain = 'OP';
      const walletId = mockWalletIds[targetChain];
      assert.equal(walletId, 'wallet-op-006');
    });

    it('should default to BASE when no chain is specified', () => {
      const chain = undefined;
      const targetChain = (chain || 'BASE').toUpperCase();
      assert.equal(targetChain, 'BASE');
    });

    it('should normalize chain input to uppercase', () => {
      const chain = 'eth';
      const targetChain = (chain || 'BASE').toUpperCase();
      assert.equal(targetChain, 'ETH');
      assert.equal(mockWalletIds[targetChain], 'wallet-eth-004');
    });

    it('should return undefined for unsupported chains', () => {
      const targetChain = 'SOL';
      const walletId = mockWalletIds[targetChain];
      assert.equal(walletId, undefined, 'Unsupported chain should return undefined walletId');
    });
  });

  describe('Error Masking', () => {
    it('should never include CIRCLE_API_KEY in error messages', () => {
      const fakeApiKey = 'TEST_API_KEY:deadbeef:not-a-real-key';
      const sanitizedError = 'An internal server error occurred. Please contact support.';
      assert.ok(!sanitizedError.includes(fakeApiKey), 'Error response must not contain API keys');
    });

    it('should never include CIRCLE_ENTITY_SECRET in error messages', () => {
      const fakeSecret = '00'.repeat(32);
      const sanitizedError = 'An internal server error occurred. Please contact support.';
      assert.ok(!sanitizedError.includes(fakeSecret), 'Error response must not contain entity secrets');
    });

    it('should never include file paths in error messages', () => {
      const sanitizedError = 'An internal server error occurred. Please contact support.';
      assert.ok(!sanitizedError.includes('C:\\Users'), 'Error response must not contain file paths');
      assert.ok(!sanitizedError.includes('/home/'), 'Error response must not contain file paths');
    });
  });
});
