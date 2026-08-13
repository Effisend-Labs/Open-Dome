const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/**
 * OpenDome Unit Test: Rate Limiting Logic
 *
 * Tests the in-memory rate limiter implementation to ensure
 * it correctly blocks excessive requests and resets after the window.
 */

describe('Rate Limiter Logic', () => {
  // Replicate the exact rate limiter logic from [...route]+api.js
  const rateLimitMap = new Map();
  const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 100;

  function simulateRequest(ip, now) {
    let record = rateLimitMap.get(ip);
    if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      record = { count: 1, startTime: now };
    } else {
      record.count++;
    }
    rateLimitMap.set(ip, record);
    return record.count <= MAX_REQUESTS_PER_WINDOW; // true = allowed, false = blocked
  }

  it('should allow requests under the limit (100/min)', () => {
    const ip = '192.168.1.1';
    const now = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const allowed = simulateRequest(ip, now);
      assert.ok(allowed, `Request ${i + 1} should be allowed`);
    }
  });

  it('should block the 101st request within the same window', () => {
    const ip = '192.168.1.2';
    const now = Date.now();
    
    // Fire 100 allowed requests
    for (let i = 0; i < 100; i++) {
      simulateRequest(ip, now);
    }
    
    // The 101st should be blocked
    const blocked = simulateRequest(ip, now);
    assert.equal(blocked, false, 'The 101st request should be blocked');
  });

  it('should reset the counter after the window expires', () => {
    const ip = '192.168.1.3';
    const now = Date.now();
    
    // Max out the window
    for (let i = 0; i < 100; i++) {
      simulateRequest(ip, now);
    }
    
    // Simulate time passing beyond the window (61 seconds later)
    const futureTime = now + RATE_LIMIT_WINDOW_MS + 1000;
    const allowed = simulateRequest(ip, futureTime);
    assert.ok(allowed, 'Request should be allowed after window reset');
  });

  it('should track different IPs independently', () => {
    const now = Date.now();
    
    // Max out IP A
    for (let i = 0; i < 100; i++) {
      simulateRequest('10.0.0.1', now);
    }
    const blockedA = simulateRequest('10.0.0.1', now);
    assert.equal(blockedA, false, 'IP A should be blocked');
    
    // IP B should still be allowed
    const allowedB = simulateRequest('10.0.0.2', now);
    assert.ok(allowedB, 'IP B should still be allowed');
  });
});
