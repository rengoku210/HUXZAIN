import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.huxzain.app',
  appName: 'Huxzain',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
