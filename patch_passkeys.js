const fs = require('fs');
const path = require('path');

const apps = [
  'C:/Users/VAI/Github/Open-Dome/OpenDome/OpenDomeApp/src/app/api/passkey',
  'C:/Users/VAI/Github/Open-Dome/OpenDome/OpenDomeSandbox/src/app/api/passkey'
];

const dynamicRpCode = `const getDynamicRpID = (req) => {
  try {
    const origin = req.headers.get('origin') || 'http://localhost';
    let host = new URL(origin).hostname;
    if (host.endsWith('.opendome.xyz') || host === 'opendome.xyz') return 'opendome.xyz';
    return host;
  } catch(e) { return 'localhost'; }
};`;

for (const dir of apps) {
  if (!fs.existsSync(dir)) continue;

  // 1. Options files
  for (const file of ['login-options+api.js', 'register-options+api.js']) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    let content = fs.readFileSync(p, 'utf8');
    
    content = content.replace(/const rpID = 'localhost';.*?\n/g, dynamicRpCode + '\n');
    content = content.replace(/export const POST = async \(request\) => {/g, 'export const POST = async (request) => {\n  const rpID = getDynamicRpID(request);');
    
    fs.writeFileSync(p, content);
  }

  // 2. Verify files
  for (const file of ['login-verify+api.js', 'register-verify+api.js']) {
    const p = path.join(dir, file);
    if (!fs.existsSync(p)) continue;
    let content = fs.readFileSync(p, 'utf8');
    
    content = content.replace(/const expectedOrigin = 'http:\/\/localhost:8083';.*?\n/g, '');
    content = content.replace(/const expectedRPID = 'localhost';.*?\n/g, dynamicRpCode + '\n');
    content = content.replace(/export const POST = async \(request\) => {/g, 'export const POST = async (request) => {\n  const expectedRPID = getDynamicRpID(request);\n  const expectedOrigin = request.headers.get("origin") || "http://localhost:8082";');
    
    // Also remove the old dynamic origin check inside if it exists
    content = content.replace(/const origin = request\.headers\.get\('origin'\) \|\| expectedOrigin;/g, '');
    content = content.replace(/expectedOrigin: origin,/g, 'expectedOrigin: expectedOrigin,');
    
    fs.writeFileSync(p, content);
  }
}
console.log('Done replacing');
