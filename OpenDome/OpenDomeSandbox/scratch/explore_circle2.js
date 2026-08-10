import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const client = initiateDeveloperControlledWalletsClient({
  apiKey: "LIVE_API_KEY:53cce4ded3d2f66f68c47caae2061a2d:c888d50978d6b7bfe0eade6623d8d085",
  entitySecret: "78ac1083d006359015427bf6edae6ed860e6a9cf4db08c853b9ea9bc0817b904"
});

console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
