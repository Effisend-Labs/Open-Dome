import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Load heavy Node SDKs at runtime from project node_modules.
 * Metro mangles packages like @google-cloud/firestore / google-gax when
 * bundling API routes (e.g. loggingUtils.log is undefined locally).
 */
export const nodeRequire = createRequire(
  path.join(process.cwd(), 'package.json')
);
