#!/usr/bin/env node
/**
 * Install + web export build smoke test for every Expo app.
 * Respects each package's .npmrc (min-release-age=7).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const APPS = [
  { dir: 'Landing', build: 'npm run build' },
  { dir: 'OpenDome/OpenDomeApp', build: 'npm run build' },
  { dir: 'OpenDome/OpenDomeSandbox', build: 'npm run build' },
  { dir: 'OpenDome/OpenDomeMiniApps/Demo', build: 'npm run build' },
  { dir: 'OpenDome/OpenDomeMiniApps/Wallet', build: 'npm run build' },
  { dir: 'OpenDome/OpenDomeMiniApps/TokyoDome', build: 'npx expo export -p web' },
  { dir: 'OpenDome/OpenDomeMiniApps/IMMTheater', build: 'npx expo export -p web' },
  { dir: 'OpenDome/OpenDomeMiniApps/KorakuenHall', build: 'npx expo export -p web' },
  { dir: 'OpenDome/OpenDomeMiniApps/GalleryAaMo', build: 'npx expo export -p web' },
  { dir: 'OpenDome/OpenDomeMiniApps/Admin', build: 'npm run build' },
  { dir: 'OpenDome/OpenDomeMiniApps/Scanner', build: 'npm run build' },
];

const results = [];

for (const app of APPS) {
  const cwd = path.join(ROOT, app.dir);
  const label = app.dir;
  console.log(`\n======== ${label} ========`);
  try {
    if (!fs.existsSync(path.join(cwd, 'node_modules'))) {
      console.log('Installing...');
      execSync('npm install', { cwd, stdio: 'inherit' });
    } else {
      console.log('Reinstalling to align lockfile...');
      execSync('npm install', { cwd, stdio: 'inherit' });
    }
    console.log('Building...');
    execSync(app.build, { cwd, stdio: 'inherit' });
    results.push({ app: label, ok: true });
    console.log(`OK ${label}`);
  } catch (err) {
    results.push({ app: label, ok: false, error: err.message });
    console.error(`FAIL ${label}`);
  }
}

console.log('\n======== SUMMARY ========');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.app}`);
}
const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);
