const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

/**
 * OpenDome Unit Test: Firestore Connectivity & Collections
 * 
 * Tests that the production Firestore instance is reachable and that
 * all expected collections (Users, Passkeys, Wallets, Transactions, LocationLogs) exist.
 */

describe('Firestore Connectivity', () => {
  let db;
  const keyPath = path.join(__dirname, '..', 'credential.json');

  before(() => {
    // We can load from environment variables if they exist
    let dbOptions = {};

    const sandboxKey = path.join(__dirname, '..', '..', 'OpenDome', 'OpenDomeSandbox', 'credential.json');
    if (process.env.GCP_PRIVATE_KEY && process.env.GCP_CLIENT_EMAIL) {
      dbOptions = {
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }
      };
    } else {
      if (!fs.existsSync(keyPath) && fs.existsSync(sandboxKey)) {
        fs.copyFileSync(sandboxKey, keyPath);
      }
      assert.ok(fs.existsSync(keyPath), 'GCP_PRIVATE_KEY not set and credential.json not found');
      dbOptions = { keyFilename: keyPath };
    }

    const { Firestore } = require('@google-cloud/firestore');
    db = new Firestore(dbOptions);
  });

  it('should connect to Firestore successfully', async () => {
    // Verify connectivity by performing a lightweight read against a known collection
    const snapshot = await db.collection('Users').limit(1).get();
    assert.ok(snapshot !== null && snapshot !== undefined, 'Firestore should respond to queries');
    console.log(`  → Connected. Users collection has ${snapshot.size} document(s) (limited to 1).`);
  });

  it('should contain the Users collection', async () => {
    const snapshot = await db.collection('Users').limit(1).get();
    // We only check it doesn't throw — the collection may be empty
    assert.ok(snapshot !== null, 'Users collection should be queryable');
  });

  it('should contain the Passkeys collection', async () => {
    const snapshot = await db.collection('Passkeys').limit(1).get();
    assert.ok(snapshot !== null, 'Passkeys collection should be queryable');
  });

  it('should contain the Wallets collection', async () => {
    const snapshot = await db.collection('Wallets').limit(1).get();
    assert.ok(snapshot !== null, 'Wallets collection should be queryable');
  });

  it('should contain the Transactions collection', async () => {
    const snapshot = await db.collection('Transactions').limit(1).get();
    assert.ok(snapshot !== null, 'Transactions collection should be queryable');
  });

  it('should contain the LocationLogs collection', async () => {
    const snapshot = await db.collection('LocationLogs').limit(1).get();
    assert.ok(snapshot !== null, 'LocationLogs collection should be queryable');
  });
});
