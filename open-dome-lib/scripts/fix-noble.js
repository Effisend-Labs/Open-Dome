const fs = require('fs');
const path = require('path');

/**
 * Automatically patches @noble/hashes package.json files to include .js extensions in exports.
 * This fixes compatibility issues with Metro/Expo bundlers when libraries like viem or ethers
 * import subpaths with explicit extensions.
 */
function patchNobleHashes(dir) {
  const pkgPath = path.join(dir, 'package.json');
  
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name === '@noble/hashes' && pkg.exports) {
        let changed = false;
        // Map keys like "./sha256" to also support "./sha256.js"
        Object.keys(pkg.exports).forEach(key => {
          if (key.startsWith('./') && !key.endsWith('.js')) {
            const jsKey = key + '.js';
            if (!pkg.exports[jsKey]) {
              pkg.exports[jsKey] = pkg.exports[key];
              changed = true;
            }
          }
        });
        
        if (changed) {
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          console.log(`[opendome-fix] Patched exports in ${pkgPath}`);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Recursive search in node_modules
  const nmPath = path.join(dir, 'node_modules');
  if (fs.existsSync(nmPath)) {
    try {
      const modules = fs.readdirSync(nmPath);
      modules.forEach(mod => {
        const fullPath = path.join(nmPath, mod);
        if (fs.lstatSync(fullPath).isDirectory()) {
          if (mod.startsWith('@')) {
            // Handle scoped packages
            fs.readdirSync(fullPath).forEach(sub => {
              patchNobleHashes(path.join(fullPath, sub));
            });
          } else {
            patchNobleHashes(fullPath);
          }
        }
      });
    } catch (e) {
      // Ignore read errors
    }
  }
}

console.log('[opendome-fix] Running @noble/hashes compatibility patch...');
patchNobleHashes(process.cwd());
