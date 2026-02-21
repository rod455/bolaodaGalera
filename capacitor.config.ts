import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bolaonacopa.app',
  appName: 'Bolão na Copa',
  webDir: 'dist',
  server: {
    // Permite que o deep link bolaonacopa:// seja tratado pelo app
    androidScheme: 'https',
  },
};

export default config;
