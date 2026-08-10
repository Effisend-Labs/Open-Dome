#!/usr/bin/env node
const { execFileSync } = require('child_process');
const path = require('path');
execFileSync(process.execPath, [path.join(__dirname, '../../sdk/update-packages.js')], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
