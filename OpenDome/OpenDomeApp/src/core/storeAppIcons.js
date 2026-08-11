const demoIcon = require('../assets/store-demo.png');
const walletIcon = require('../assets/store-wallet.png');
const adminIcon = require('../assets/store-admin.png');

export const STORE_APP_ICONS = {
  demo: demoIcon,
  wallet: walletIcon,
  admin: adminIcon,
};

export function enrichStoreApp(app) {
  if (!app) return app;

  const iconSource = STORE_APP_ICONS[app.id];
  if (!iconSource) return app;

  return {
    ...app,
    iconSource,
  };
}
