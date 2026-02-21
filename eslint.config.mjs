import expoConfig from 'eslint-config-expo/flat.js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default [
  ...expoConfig,
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'web-build/',
      'babel.config.js',
    ],
  },
  eslintConfigPrettier,
];
