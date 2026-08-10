const fs = require('fs');
const path = require('path');

console.log('Running SDK auto-sanitization (clearing peer dependencies)...');

const targetPackages = ['react', 'react-dom', 'react-native', 'react-native-web'];

for (const pkg of targetPackages) {
  const pkgPath = path.join(__dirname, '../node_modules', pkg);
  if (fs.existsSync(pkgPath)) {
    console.log(`Deleting duplicate peer dependency: ${pkgPath}`);
    try {
      fs.rmSync(pkgPath, { recursive: true, force: true });
    } catch (e) {
      console.warn(`Failed to delete ${pkgPath}`);
    }
  }
}
console.log('SDK Auto-sanitization complete.');
