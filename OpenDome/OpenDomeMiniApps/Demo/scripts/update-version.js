const fs = require('fs');
const path = require('path');

// 1. Read the new version from package.json (after npm version patch)
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;

// 2. Update constants.js
const constantsPath = path.join(__dirname, '../src/constants.js');
const content = `// Enterprise Version Control
// This version is compared at boot-time to force cache invalidation
export const APP_VERSION = "${version}";
`;

fs.writeFileSync(constantsPath, content);

console.log(`[VersionSync] Synchronized constants.js to version ${version}`);
