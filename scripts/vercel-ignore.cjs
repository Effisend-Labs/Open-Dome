#!/usr/bin/env node
/**
 * Vercel Ignored Build Step helper for this monorepo.
 *
 * Exit 0 → skip build
 * Exit 1 → continue build
 *
 * Usage (cwd = project Root Directory on Vercel):
 *   node ../../scripts/vercel-ignore.cjs . ../../open-dome-lib
 *
 * Compares against VERCEL_GIT_PREVIOUS_SHA when set (preferred on Vercel),
 * otherwise HEAD^ / previous commit.
 */
const { spawnSync } = require('node:child_process');

const paths = process.argv.slice(2).filter(Boolean);
if (paths.length === 0) {
  console.log('vercel-ignore: no paths provided — building');
  process.exit(1);
}

function resolvePreviousRef() {
  const fromVercel = (process.env.VERCEL_GIT_PREVIOUS_SHA || '').trim();
  if (fromVercel) return fromVercel;

  const parent = spawnSync('git', ['rev-parse', 'HEAD^'], {
    encoding: 'utf8',
  });
  if (parent.status === 0 && parent.stdout.trim()) {
    return parent.stdout.trim();
  }

  // First commit / shallow clone with no parent → must build
  return null;
}

const prev = resolvePreviousRef();
if (!prev) {
  console.log('vercel-ignore: no previous SHA — building');
  process.exit(1);
}

const result = spawnSync(
  'git',
  ['diff', '--quiet', prev, 'HEAD', '--', ...paths],
  { encoding: 'utf8' }
);

if (result.status === 0) {
  console.log(
    `vercel-ignore: no changes in [${paths.join(', ')}] since ${prev.slice(0, 7)} — skipping`
  );
  process.exit(0);
}

if (result.status === 1) {
  console.log(
    `vercel-ignore: changes in [${paths.join(', ')}] since ${prev.slice(0, 7)} — building`
  );
  process.exit(1);
}

console.log(
  `vercel-ignore: git diff failed (status ${result.status}) — building`
);
if (result.stderr) console.log(result.stderr.trim());
process.exit(1);
