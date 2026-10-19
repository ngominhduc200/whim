import type { ConfigContext, ExpoConfig } from 'expo/config';
import { withEntitlementsPlist, type ConfigPlugin } from 'expo/config-plugins';

// expo-notifications adds the push entitlement, which free Personal Team signing can't use. The app only sends
// local notifications (lib/notify.ts), which don't need it, so it's taken back out.
const withoutPushEntitlement: ConfigPlugin = (config) =>
  withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });

// Expo CLI loads .env before evaluating this file. @rnmapbox/maps reads the secret download token
// from RNMAPBOX_MAPS_DOWNLOAD_TOKEN during `pod install`, so pass it through the environment
// instead of writing it into the generated Podfile.
if (process.env.MAPBOX_DOWNLOAD_TOKEN && !process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN) {
  process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = process.env.MAPBOX_DOWNLOAD_TOKEN;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SVSD',
  slug: 'app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'svsd',
  userInterfaceStyle: 'light',
  ios: {
    // the doodled camera (1024×1024, no transparency): home screen and notifications
    icon: './assets/images/app-icon.png',
    bundleIdentifier: 'xyz.ducngo.svsd',
    // free "Personal Team" signing for installing on your own iPhone
    appleTeamId: 'BSR86PG8W8',
    supportsTablet: false,
    infoPlist: {
      // the name under the home screen icon and on notifications (the project itself stays "SVSD")
      CFBundleDisplayName: 'whim',
      // hides the dev client's floating gear button (it covers the profile circle); ⌘D / shake still opens the dev menu
      EXDevMenuShowFloatingActionButton: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    '@rnmapbox/maps',
    [
      'expo-location',
      { locationWhenInUsePermission: 'SVSD uses your location to center the map and pin your posts.' },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'SVSD uses the camera to take photos for your posts.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      { photosPermission: 'SVSD lets you pick a photo for a post when no camera is available.' },
    ],
    withoutPushEntitlement,
  ] as ExpoConfig['plugins'],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
