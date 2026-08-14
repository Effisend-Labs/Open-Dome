import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Runtime require for Node SDKs Metro must not bundle (ethers / Firestore).
 * Vercel cwd is /var/task — prefer boot cache from api/load-*.js, then search.
 */

function exists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function packageJsonFor(id) {
  const bare = id.startsWith('@')
    ? id.split('/').slice(0, 2).join('/')
    : id.split('/')[0];
  return path.join('node_modules', ...bare.split('/'), 'package.json');
}

function nativeCache(id) {
  const bag = globalThis.__OPENDOME_NATIVE__;
  if (!bag || typeof bag !== 'object') return null;
  if (bag[id]) return bag[id];
  return null;
}

function collectRoots() {
  const cwd = process.cwd();
  const task = process.env.LAMBDA_TASK_ROOT || cwd;
  const roots = new Set([cwd, task]);

  let dir = cwd;
  for (let i = 0; i < 8; i++) {
    roots.add(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  roots.add(path.join(cwd, 'OpenDome', 'OpenDomeMiniApps', 'Admin'));
  roots.add(path.join(task, 'OpenDome', 'OpenDomeMiniApps', 'Admin'));
  roots.add(path.join(cwd, 'api'));
  roots.add(path.join(task, 'api'));
  roots.add(path.join(cwd, 'dist', 'server'));
  roots.add(path.join(task, 'dist', 'server'));

  return [...roots].filter(exists);
}

function collectRequireFiles(id) {
  const cwd = process.cwd();
  const task = process.env.LAMBDA_TASK_ROOT || cwd;
  // Always try these — createRequire only needs a path for resolution base;
  // package.json is often absent inside the Vercel function bundle.
  const always = [
    path.join(cwd, 'api', 'vendor', 'package.json'),
    path.join(cwd, 'api', 'load-firestore.js'),
    path.join(cwd, 'api', 'load-ethers.js'),
    path.join(cwd, 'api', 'index.js'),
    path.join(cwd, 'package.json'),
    path.join(task, 'api', 'vendor', 'package.json'),
    path.join(task, 'api', 'load-firestore.js'),
    path.join(task, 'api', 'load-ethers.js'),
    path.join(task, 'api', 'index.js'),
    path.join(task, 'package.json'),
  ];

  const files = [...always];
  const relPkg = packageJsonFor(id);
  for (const root of collectRoots()) {
    for (const file of [
      path.join(root, 'package.json'),
      path.join(root, 'api', 'index.js'),
      path.join(root, 'api', 'load-firestore.js'),
      path.join(root, 'api', 'load-ethers.js'),
      path.join(root, 'api', 'vendor', 'package.json'),
      path.join(root, relPkg),
    ]) {
      if (exists(file)) files.push(file);
    }
  }
  return [...new Set(files)];
}

export function nodeRequire(id) {
  const cached = nativeCache(id);
  if (cached) return cached;

  const files = collectRequireFiles(id);
  let lastErr;
  for (const file of files) {
    try {
      const mod = createRequire(file)(id);
      const g = globalThis;
      g.__OPENDOME_NATIVE__ = g.__OPENDOME_NATIVE__ || {};
      g.__OPENDOME_NATIVE__[id] = mod;
      return mod;
    } catch (err) {
      lastErr = err;
    }
  }

  const err = lastErr || new Error(`Cannot find module '${id}'`);
  err.message = `${err.message} (cwd=${process.cwd()}; tried ${files.length || 0} roots)`;
  throw err;
}
