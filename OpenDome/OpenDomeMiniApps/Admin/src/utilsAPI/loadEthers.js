import { nodeRequire } from './nodeRequire';

export function loadEthers() {
  try {
    return nodeRequire('ethers');
  } catch (err) {
    const wrapped = new Error(
      'Admin backend could not load ethers. Redeploy Admin so api/vendor packs ethers into the serverless function.',
    );
    wrapped.cause = err;
    wrapped.status = 500;
    throw wrapped;
  }
}
