module.exports = {
  extends: ['expo'],
  ignorePatterns: ['dist/*'],
  globals: {
    Response: 'readonly',
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
      },
    },
  ],
};
