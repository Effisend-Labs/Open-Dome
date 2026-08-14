/**
 * Copy ethers + Firestore (and their runtime deps) into api/vendor so Vercel
 * can ship them via includeFiles. NFT alone often misses these on Admin.
 *
 * Run from Admin root after npm install (see vercel.json installCommand).
 */
const fs = require('fs');
const path = require('path');

const root = __dirname.includes(`${path.sep}api`)
  ? path.join(__dirname, '..')
  : __dirname;
const nm = path.join(root, 'node_modules');
const vendorRoot = path.join(root, 'api', 'vendor');
const vendorNm = path.join(vendorRoot, 'node_modules');

const ROOT_PACKAGES = ['ethers', '@google-cloud/firestore'];

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function pkgDir(name) {
  return path.join(nm, ...name.split('/'));
}

function readDeps(name) {
  const file = path.join(pkgDir(name), 'package.json');
  if (!exists(file)) return [];
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Object.keys(json.dependencies || {});
}

function collectTree(names) {
  const seen = new Set();
  const queue = [...names];
  while (queue.length) {
    const name = queue.pop();
    if (!name || seen.has(name)) continue;
    // Skip types-only / optional noise
    if (name.startsWith('@types/')) continue;
    if (!exists(pkgDir(name))) {
      console.warn(`[pack-vendor] skip missing ${name}`);
      continue;
    }
    seen.add(name);
    for (const dep of readDeps(name)) queue.push(dep);
  }
  return [...seen].sort();
}

function copyPkg(name) {
  const src = pkgDir(name);
  const dest = path.join(vendorNm, ...name.split('/'));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function main() {
  fs.rmSync(vendorRoot, { recursive: true, force: true });
  fs.mkdirSync(vendorNm, { recursive: true });
  fs.writeFileSync(
    path.join(vendorRoot, 'package.json'),
    `${JSON.stringify({ name: 'admin-api-vendor', private: true }, null, 2)}\n`,
  );

  const pkgs = collectTree(ROOT_PACKAGES);
  for (const name of pkgs) copyPkg(name);

  console.log(`[pack-vendor] copied ${pkgs.length} packages → api/vendor/node_modules`);
  console.log(`[pack-vendor] roots: ${ROOT_PACKAGES.join(', ')}`);
}

main();
