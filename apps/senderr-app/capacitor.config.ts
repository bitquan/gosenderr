import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosenderr.courier',
  appName: 'Gosenderr Courier',
  webDir: 'dist',
  // Live hosted courier app
  server: {
    url: 'https://gosenderr-courier.web.app',
    cleartext: false
  },
  ios: {
    contentInset: 'automatic',
    // Required for navigation and location tracking
    allowsLinkPreview: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Geolocation: {
      permissions: ['location', 'coarseLocation']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6E56CF',
      showSpinner: false
    }
  }
};

export default config;
