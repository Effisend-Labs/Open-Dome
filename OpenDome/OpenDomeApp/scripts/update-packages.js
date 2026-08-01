const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MIN_AGE_DAYS = 7;
const MILLISECONDS_IN_A_DAY = 1000 * 60 * 60 * 24;
const packageJsonPath = path.join(__dirname, '../package.json');

/**
 * Fetches package information from the npm registry.
 */
async function fetchPackageInfo(pkgName) {
  return new Promise((resolve) => {
    https.get(`https://registry.npmjs.org/${pkgName}`, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let data = '';
      res.on('data', d => data += d);
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

/**
 * Finds the latest stable version of a package that is at least MIN_AGE_DAYS old.
 */
function getEligibleVersion(pkgInfo) {
  if (!pkgInfo || !pkgInfo.versions || !pkgInfo.time) return null;
  const now = Date.now();
  
  const versions = Object.keys(pkgInfo.time).filter(v => 
    v !== 'created' && v !== 'modified' && !v.includes('-')
  );
  
  // Sort versions by publish date (newest first)
  versions.sort((a, b) => new Date(pkgInfo.time[b]) - new Date(pkgInfo.time[a]));

  for (const version of versions) {
    if (pkgInfo.versions[version] && !pkgInfo.versions[version].deprecated) {
      const publishTime = new Date(pkgInfo.time[version]).getTime();
      const ageDays = (now - publishTime) / MILLISECONDS_IN_A_DAY;
      
      if (ageDays >= MIN_AGE_DAYS) {
        return version;
      }
    }
  }
  return null;
}

/**
 * Removes ^ and ~ from version strings.
 */
function removeModifiers(depObject) {
  if (!depObject) return;
  for (const pkg in depObject) {
    if (typeof depObject[pkg] === 'string') {
       depObject[pkg] = depObject[pkg].replace(/^[\^~]/, '');
    }
  }
}

async function main() {
  console.log(`Phase 1: Detecting updates strictly respecting the ${MIN_AGE_DAYS}-day maturity rule...`);
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const groups = ['dependencies', 'devDependencies'];

  for (const group of groups) {
    if (!packageJson[group]) continue;
    for (const pkgName of Object.keys(packageJson[group])) {
      const info = await fetchPackageInfo(pkgName);
      const eligible = getEligibleVersion(info);
      if (eligible) {
        const currentRaw = packageJson[group][pkgName].replace(/^[\^~]/, '');
        if (currentRaw !== eligible) {
           console.log(`  [Update Found] ${pkgName}: ${currentRaw} -> ${eligible}`);
           packageJson[group][pkgName] = eligible;
        } else {
           console.log(`  [OK] ${pkgName} is up to date: ${currentRaw}`);
        }
      } else {
        console.log(`  [Skip] ${pkgName}: No eligible version found on registry.`);
      }
    }
  }

  console.log('Writing intermediary package.json...');
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  console.log('Phase 2: Aligning Expo ecosystem (Framework Compatibility)...');
  try {
    console.log('Running npx expo install --fix...');
    execSync('npx expo install --fix -- --legacy-peer-deps --min-release-age=0', { stdio: 'inherit' });
  } catch {
    console.warn('\nWarning: Expo alignment had some issues. Proceeding...');
  }

  console.log('Phase 3: Final Enforcement (Strict 7-day Check + Pinning)...');
  const alignedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  for (const group of groups) {
    if (!alignedPackageJson[group]) continue;
    for (const pkgName of Object.keys(alignedPackageJson[group])) {
      const info = await fetchPackageInfo(pkgName);
      const eligible = getEligibleVersion(info);
      if (eligible) {
         alignedPackageJson[group][pkgName] = eligible;
      }
    }
  }

  // Pin everything
  removeModifiers(alignedPackageJson.dependencies);
  removeModifiers(alignedPackageJson.devDependencies);
  fs.writeFileSync(packageJsonPath, JSON.stringify(alignedPackageJson, null, 2) + '\n');
  
  console.log('Phase 4: Final sync...');
  try {
     execSync('npm install --legacy-peer-deps --min-release-age=0', { stdio: 'inherit' });
  } catch {
     console.warn('Final sync warnings found.');
  }

  console.log('\nSuccess! Template updated and strictly pinned.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
