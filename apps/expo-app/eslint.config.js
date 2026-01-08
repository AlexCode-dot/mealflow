// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/**',
      'build/**',
      '.expo/**',
      'node_modules/**',
      'coverage/**',
      'android/**',
      'ios/**',
      '.turbo/**',
    ],
  },
]);
