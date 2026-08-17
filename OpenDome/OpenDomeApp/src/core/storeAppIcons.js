const demoIcon = require('../assets/store-demo.png');
const walletIcon = require('../assets/store-wallet.png');
const adminIcon = require('../assets/store-admin.png');
const scannerIcon = require('../assets/store-scanner.png');
const agentIcon = require('../assets/store-agent.png');

export const STORE_APP_ICONS = {
  demo: demoIcon,
  wallet: walletIcon,
  admin: adminIcon,
  scanner: scannerIcon,
  openagent: agentIcon,
};

export function enrichStoreApp(app) {
  if (!app) return app;

  const iconSource = STORE_APP_ICONS[app.id];

  return {
    ...app,
    ...(iconSource ? { iconSource } : {}),
    color: app.color || '#111111',
  };
}
