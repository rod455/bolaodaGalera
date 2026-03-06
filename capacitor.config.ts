import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bolaonacopa.app',
  appName: 'Bolão na Copa',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://www.bolaonacopa.com.br',
  },
  plugins: {
    AdMob: {
      appId: 'ca-app-pub-8494311740043165~4855337174',
    },
  },
  includePlugins: [
    '@capacitor/app',
    '@capacitor-community/admob',
    '@capacitor-firebase/analytics',
    '@capacitor/push-notifications',
    '@capacitor/share',
    '@capacitor/splash-screen',
    '@capacitor/status-bar',
    '@capgo/capacitor-social-login',
  ],
};

export default config;
