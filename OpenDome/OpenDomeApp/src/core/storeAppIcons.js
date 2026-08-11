const demoIcon = require('../assets/store-demo.png');
const walletIcon = require('../assets/store-wallet.png');

export const STORE_APP_ICONS = {
  demo: demoIcon,
  wallet: walletIcon,
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
