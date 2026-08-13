/**
 * Vercel NFT traces require() here and copies packages into /var/task.
 * Do not call these at module load — that crashes every page including /main.
 */
module.exports = {
  firestore: () => require('@google-cloud/firestore'),
  circle: () => require('@circle-fin/developer-controlled-wallets'),
  genai: () => require('@google/genai'),
};
