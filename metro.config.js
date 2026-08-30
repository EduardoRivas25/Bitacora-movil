const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Desactivar temporalmente package exports inestables en Windows para resolver @supabase/supabase-js
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
