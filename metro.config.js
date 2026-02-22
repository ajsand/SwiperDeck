// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite web support requires .wasm files to be treated as assets
config.resolver.assetExts.push('wasm');

// SharedArrayBuffer requires Cross-Origin-Embedder-Policy + Cross-Origin-Opener-Policy headers
config.server.enhanceMiddleware = (metroMiddleware, _metroServer) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return metroMiddleware(req, res, next);
  };
};

module.exports = config;
