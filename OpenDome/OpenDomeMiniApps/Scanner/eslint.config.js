const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['dist/**', 'node_modules/**', '.expo/**', 'api/**', 'coverage/**'] },
  {
    languageOptions: {
      globals: { Buffer: 'readonly' },
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-unescaped-entities': 'off',
      'jsx-a11y/media-has-caption': 'off',
      'no-unused-vars': 'off',
    },
  },
];
