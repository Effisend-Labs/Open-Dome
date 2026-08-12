/**
 * Applies sdk/expo-57-catalog.json to every Expo app package.json.
 * Only rewrites packages that already exist in dependencies/devDependencies
 * (plus forces expo/react/react-native/react-dom when present).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const catalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'expo-57-catalog.json'), 'utf8')
);
const NPMRC = 'min-release-age=7\nlegacy-peer-deps=true\n';

const APP_DIRS = [
  'Landing',
  'OpenDome/OpenDomeApp',
  'OpenDome/OpenDomeSandbox',
  'OpenDome/OpenDomeMiniApps/Demo',
  'OpenDome/OpenDomeMiniApps/Wallet',
  'OpenDome/OpenDomeMiniApps/TokyoDome',
  'OpenDome/OpenDomeMiniApps/IMMTheater',
  'OpenDome/OpenDomeMiniApps/KorakuenHall',
  'OpenDome/OpenDomeMiniApps/GalleryAaMo',
  'OpenDome/OpenDomeMiniApps/Admin',
  'OpenDome/OpenDomeMiniApps/Scanner',
  'Contracts',
  'open-dome-lib',
  'test',
];

function writeNpmrc(dir) {
  const target = path.join(ROOT, dir, '.npmrc');
  fs.writeFileSync(target, NPMRC);
  console.log(`[npmrc] ${dir}/.npmrc`);
}

function applyCatalog(relDir) {
  const pkgPath = path.join(ROOT, relDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const groups = ['dependencies', 'devDependencies'];
  let changed = 0;

  for (const group of groups) {
    if (!pkg[group]) continue;
    for (const [name, version] of Object.entries(catalog.packages)) {
      if (pkg[group][name] === undefined) continue;
      if (pkg[group][name] !== version) {
        console.log(`  ${relDir}: ${name}: ${pkg[group][name]} -> ${version}`);
        pkg[group][name] = version;
        changed += 1;
      }
    }
  }

  // Sandbox previously used react-native ^1000.0.0 — force real SDK pin
  if (pkg.dependencies?.['react-native']) {
    pkg.dependencies['react-native'] = catalog.packages['react-native'];
  }

  if (changed > 0 || relDir.includes('Sandbox')) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
  console.log(`[catalog] ${relDir}: ${changed} dep(s) updated`);
}

function updateAgentsMd(relDir) {
  const agentsPath = path.join(ROOT, relDir, 'AGENTS.md');
  if (!fs.existsSync(agentsPath)) return;
  const next =
    '# Expo HAS CHANGED\n\n' +
    'Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.\n';
  fs.writeFileSync(agentsPath, next);
  console.log(`[agents] ${relDir}/AGENTS.md -> v57.0.0`);
}

fs.writeFileSync(path.join(ROOT, '.npmrc'), NPMRC);
console.log('[npmrc] ./.npmrc');

for (const dir of APP_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  writeNpmrc(dir);
  applyCatalog(dir);
  updateAgentsMd(dir);
}

console.log('\nDone. Next: npm install in each Expo app, then npm run build.');
