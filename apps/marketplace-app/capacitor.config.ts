import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gosenderr.marketplace',
  appName: 'GoSenderr',
  webDir: 'dist',
  server: {
    // Live hosted marketplace app
    url: 'https://gosenderr-marketplace.web.app',
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
