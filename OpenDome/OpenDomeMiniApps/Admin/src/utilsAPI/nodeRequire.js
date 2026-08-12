import { createRequire } from 'node:module';
import path from 'node:path';

export const nodeRequire = createRequire(
  path.join(process.cwd(), 'package.json')
);
