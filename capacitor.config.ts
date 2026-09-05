import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.memopear.app',
  appName: 'MemoPear',
  // Vite builds the web app into `dist`; Capacitor bundles that into the APK.
  webDir: 'dist',
  android: {
    // Allow http during local development against `npx cap run`.
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
