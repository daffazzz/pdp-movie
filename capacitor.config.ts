import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pdp.movie',
  appName: 'PDP Movie',
  webDir: 'out',
  overrideUserAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
  server: {
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;