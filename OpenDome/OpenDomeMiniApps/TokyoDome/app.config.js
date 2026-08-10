// Injects per-app OD_APP_TOKEN (secret) into expo.extra at build time.
export default ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    odAppToken: process.env.OD_APP_TOKEN ?? null,
  },
});
