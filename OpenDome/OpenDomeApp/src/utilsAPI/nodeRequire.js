import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Load heavy Node SDKs at runtime from node_modules.
 * Metro mangles packages like @google-cloud/firestore / google-gax when
 * bundling API routes (constructSettings / loggingUtils.log).
 *
 * On Vercel cwd is /var/task — try several roots because NFT places
 * traced modules next to api/index.js, not always next to package.json.
 */
function buildLoaders() {
  const files = [
    path.join(process.cwd(), 'package.json'),
    path.join(process.cwd(), 'api', 'index.js'),
    path.join(process.cwd(), 'dist', 'server', 'package.json'),
  ];
  const loaders = [];
  for (const file of files) {
    if (fs.existsSync(file)) loaders.push(createRequire(file));
  }
  if (!loaders.length) {
    loaders.push(createRequire(path.join(process.cwd(), 'package.json')));
  }
  return loaders;
}

const loaders = buildLoaders();

export function nodeRequire(id) {
  let lastErr;
  for (const req of loaders) {
    try {
      return req(id);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}
