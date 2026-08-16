const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', 'node_modules/**', '.expo/**', 'coverage/**'],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-no-comment-textnodes': 'off',
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': 'off',
    },
  },
]);
