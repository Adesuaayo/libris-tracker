import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.libris.app',
  appName: 'Libris',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0f172a", // Slate 900
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
  },
  // Deep link configuration for password reset
  android: {
    appendUserAgent: 'Libris-Android',
  },
};

export default config;