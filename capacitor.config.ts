import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bolaonacopa.app',
  appName: 'Bolão na Copa',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://www.bolaonacopa.com.br',
  },
};

export default config;
