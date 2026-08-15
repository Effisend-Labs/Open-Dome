import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Runtime require for Node SDKs Metro must not bundle (Firestore / Circle).
 * Vercel cwd is /var/task and the app may be nested at OpenDome/OpenDomeApp.
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

  roots.add(path.join(cwd, 'OpenDome', 'OpenDomeApp'));
  roots.add(path.join(task, 'OpenDome', 'OpenDomeApp'));
  roots.add(path.join(cwd, 'api'));
  roots.add(path.join(cwd, 'dist', 'server'));

  return [...roots].filter(exists);
}

function collectRequireFiles(id) {
  const files = [];
  const relPkg = packageJsonFor(id);
  for (const root of collectRoots()) {
    for (const file of [
      path.join(root, 'package.json'),
      path.join(root, 'api', 'index.js'),
      path.join(root, 'api', 'load-firestore.js'),
      path.join(root, 'api', 'load-logging.js'),
      path.join(root, 'api', 'load-opendome.js'),
      path.join(root, 'api', 'load-genai.js'),
      path.join(root, 'api', 'load-viem.js'),
      path.join(root, 'api', 'load-ethers.js'),
      path.join(root, relPkg),
    ]) {
      if (exists(file)) files.push(file);
    }
  }
  return [...new Set(files)];
}

function subpathFromPackage(id) {
  if (!id.startsWith('opendome/')) return null;
  return `./${id.slice('opendome/'.length)}`;
}

function vendorSubpath(id) {
  if (!id.startsWith('opendome/dist/')) return null;
  return `./vendor/opendome/${id.slice('opendome/dist/'.length)}`;
}

export function nodeRequire(id) {
  const files = collectRequireFiles(id);
  const relative = subpathFromPackage(id);
  const vendor = vendorSubpath(id);
  let lastErr;
  for (const file of files) {
    const req = createRequire(file);
    try {
      return req(id);
    } catch (err) {
      lastErr = err;
    }
    if (relative) {
      try {
        return req(relative);
      } catch (err) {
        lastErr = err;
      }
    }
    if (vendor) {
      try {
        return req(vendor);
      } catch (err) {
        lastErr = err;
      }
    }
  }

  const err = lastErr || new Error(`Cannot find module '${id}'`);
  err.message = `${err.message} (cwd=${process.cwd()}; tried ${files.length || 0} roots)`;
  throw err;
}
