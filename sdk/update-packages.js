/**
 * Shared dependency updater for Open-Dome Expo apps.
 * - Aligns Expo SDK packages from sdk/expo-57-catalog.json
 * - Updates non-catalog deps to newest version published >= MIN_AGE_DAYS ago
 * - NEVER bypasses npm min-release-age (supply-chain cooldown)
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MIN_AGE_DAYS = 7;
const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;

const packageJsonPath = path.join(process.cwd(), 'package.json');

function resolveCatalogPath() {
  const fromSdkDir = path.join(__dirname, 'expo-57-catalog.json');
  if (fs.existsSync(fromSdkDir)) return fromSdkDir;
  throw new Error('sdk/expo-57-catalog.json not found next to update-packages.js');
}

async function fetchPackageInfo(pkgName) {
  return new Promise((resolve) => {
    https.get(`https://registry.npmjs.org/${pkgName}`, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function getEligibleVersion(pkgInfo) {
  if (!pkgInfo || !pkgInfo.versions || !pkgInfo.time) return null;
  const now = Date.now();
  const versions = Object.keys(pkgInfo.time).filter(
    (v) => v !== 'created' && v !== 'modified' && !v.includes('-')
  );
  versions.sort(
    (a, b) => new Date(pkgInfo.time[b]) - new Date(pkgInfo.time[a])
  );
  for (const version of versions) {
    if (pkgInfo.versions[version] && !pkgInfo.versions[version].deprecated) {
      const publishTime = new Date(pkgInfo.time[version]).getTime();
      const ageDays = (now - publishTime) / MILLISECONDS_IN_A_DAY;
      if (ageDays >= MIN_AGE_DAYS) return version;
    }
  }
  return null;
}

function removeModifiers(depObject) {
  if (!depObject) return;
  for (const pkg in depObject) {
    if (typeof depObject[pkg] === 'string') {
      depObject[pkg] = depObject[pkg].replace(/^[\^~]/, '');
    }
  }
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(resolveCatalogPath(), 'utf8'));
  const sdkMap = catalog.packages;
  console.log(
    `Open-Dome updater · SDK ${catalog.sdkVersion} · min-release-age=${MIN_AGE_DAYS}d (strict)`
  );

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const groups = ['dependencies', 'devDependencies'];

  console.log(`\nPhase 1: Align Expo SDK packages from catalog (${catalog.expo})...`);
  for (const group of groups) {
    if (!packageJson[group]) continue;
    for (const pkgName of Object.keys(packageJson[group])) {
      if (!sdkMap[pkgName]) continue;
      const target = sdkMap[pkgName];
      const currentRaw = String(packageJson[group][pkgName]).replace(/^[\^~]/, '');
      if (currentRaw !== target) {
        console.log(`  [SDK Align] ${pkgName}: ${currentRaw} -> ${target}`);
        packageJson[group][pkgName] = target;
      } else {
        console.log(`  [OK] ${pkgName} aligned: ${currentRaw}`);
      }
    }
  }

  console.log(`\nPhase 2: Non-SDK deps — newest version >= ${MIN_AGE_DAYS} days old...`);
  for (const group of groups) {
    if (!packageJson[group]) continue;
    for (const pkgName of Object.keys(packageJson[group])) {
      if (sdkMap[pkgName]) continue;
      if (pkgName === 'opendome' || packageJson[group][pkgName].startsWith('file:')) {
        continue;
      }
      const info = await fetchPackageInfo(pkgName);
      const eligible = getEligibleVersion(info);
      if (!eligible) {
        console.log(`  [Skip] ${pkgName}: no eligible version`);
        continue;
      }
      const currentRaw = String(packageJson[group][pkgName]).replace(/^[\^~]/, '');
      if (currentRaw !== eligible) {
        console.log(`  [Update] ${pkgName}: ${currentRaw} -> ${eligible}`);
        packageJson[group][pkgName] = eligible;
      } else {
        console.log(`  [OK] ${pkgName}: ${currentRaw}`);
      }
    }
  }

  removeModifiers(packageJson.dependencies);
  removeModifiers(packageJson.devDependencies);
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log('\nPhase 3: npm install (respects .npmrc min-release-age=7)...');
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('\nSuccess. Catalog + 7-day policy applied. No min-release-age bypass.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
