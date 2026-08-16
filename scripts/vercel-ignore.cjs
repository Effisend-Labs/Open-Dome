#!/usr/bin/env node
/**
 * Vercel Ignored Build Step for this monorepo.
 *
 * Exit 0 → skip build
 * Exit 1 → continue build
 *
 * Prefer HEAD^ (this commit only). VERCEL_GIT_PREVIOUS_SHA is a fallback when
 * the parent commit is unavailable (shallow / first commit). Using previous
 * *successful deploy* SHA causes stacked commits to rebuild everything while
 * an earlier deploy is still queued — which is what we are avoiding.
 *
 * Usage (cwd = Vercel Root Directory):
 *   node ../../scripts/vercel-ignore.cjs . ../../open-dome-lib
 */
const { spawnSync } = require('node:child_process');

const paths = process.argv.slice(2).filter(Boolean);
if (paths.length === 0) {
  console.log('vercel-ignore: no paths — building');
  process.exit(1);
}

function resolvePreviousRef() {
  const parent = spawnSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' });
  if (parent.status === 0 && parent.stdout.trim()) {
    return { ref: parent.stdout.trim(), source: 'HEAD^' };
  }

  const fromVercel = (process.env.VERCEL_GIT_PREVIOUS_SHA || '').trim();
  if (fromVercel) {
    return { ref: fromVercel, source: 'VERCEL_GIT_PREVIOUS_SHA' };
  }

  return null;
}

const prev = resolvePreviousRef();
if (!prev) {
  console.log('vercel-ignore: no previous SHA — building');
  process.exit(1);
}

console.log(`vercel-ignore: comparing ${prev.source}=${prev.ref.slice(0, 7)} → HEAD`);
console.log(`vercel-ignore: paths=[${paths.join(', ')}] cwd=${process.cwd()}`);

const result = spawnSync(
  'git',
  ['diff', '--quiet', prev.ref, 'HEAD', '--', ...paths],
  { encoding: 'utf8' }
);

if (result.status === 0) {
  console.log('vercel-ignore: no relevant changes — skipping');
  process.exit(0);
}

if (result.status === 1) {
  const names = spawnSync(
    'git',
    ['diff', '--name-only', prev.ref, 'HEAD', '--', ...paths],
    { encoding: 'utf8' }
  );
  console.log('vercel-ignore: relevant changes — building');
  if (names.stdout) console.log(names.stdout.trim());
  process.exit(1);
}

console.log(`vercel-ignore: git failed (status ${result.status}) — building`);
if (result.stderr) console.log(result.stderr.trim());
process.exit(1);
