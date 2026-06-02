// Default Expo Metro config. Required by expo-doctor since SDK 54.
// Extends expo/metro-config so Metro picks up Expo's defaults (resolver,
// transformer, asset extensions, etc.) without us overriding anything.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
