import expoConfig from 'eslint-config-expo/flat.js';

export default [
  ...expoConfig,
  { ignores: ['dist/**', 'node_modules/**', '.expo/**', 'api/**', 'coverage/**'] },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-unused-vars': 'off',
    },
  },
];
