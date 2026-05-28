import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bolaonacopa.app',
  appName: 'Bolão da Galera',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    AdMob: {
      appId: 'ca-app-pub-9316035916536420~4807390224',
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#1B5E20',
    },
  },
  includePlugins: [
    '@capacitor/app',
    '@capacitor/filesystem',
    '@capacitor-community/admob',
    '@capacitor-firebase/analytics',
    '@capacitor/push-notifications',
    '@capacitor/share',
    '@capacitor/splash-screen',
    '@capacitor/status-bar',
    '@capgo/capacitor-social-login',
    '@revenuecat/purchases-capacitor',
  ],
};

export default config;
