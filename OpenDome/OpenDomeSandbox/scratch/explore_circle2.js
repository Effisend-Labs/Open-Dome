import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
if (!apiKey || !entitySecret) {
  throw new Error('Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in the environment');
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});

console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
