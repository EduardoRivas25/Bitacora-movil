// Metro resolves the SDK's Node-only dynamic import even on native devices.
// Its runtime branch uses globalThis.crypto on React Native instead.
export const webcrypto = globalThis.crypto;
