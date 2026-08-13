import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Load heavy Node SDKs at runtime from project node_modules.
 * Metro mangles @google-cloud/firestore / google-gax when bundling API routes.
 */
export const nodeRequire = createRequire(
  path.join(process.cwd(), 'package.json')
);
