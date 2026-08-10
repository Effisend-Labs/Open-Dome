// Loads non-public OD_APP_TOKEN into expo.extra at build time.
// Note: extra is still shipped to the client bundle; for true secrecy the
// Mini App backend must mint short-lived docking tokens instead.
export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    odAppToken: process.env.OD_APP_TOKEN ?? null,
  },
});
