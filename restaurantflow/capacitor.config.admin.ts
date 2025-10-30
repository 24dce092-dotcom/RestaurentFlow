import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.restaurantflow.admin',
  appName: 'RestaurantFlow Admin',
  webDir: 'build-admin',
  server: {
    androidScheme: 'http'
  }
};

export default config;
