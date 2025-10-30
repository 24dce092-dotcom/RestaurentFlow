import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.restaurantflow.waiter',
  appName: 'RestaurantFlow Waiter',
  webDir: 'build',
  server: {
    androidScheme: 'http'
  }
};

export default config;
