import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useAppFonts } from '@/components/Text';
import { askNotificationPermissionOnce, registerNotificationMenu, updateNearbyRepeat } from '@/lib/notify';

// the map screen hides the splash once its style is ready
SplashScreen.preventAutoHideAsync();
// a dev menu item that sends the "Moment nearby" notification on demand
if (__DEV__) registerNotificationMenu();
// notification permission is asked for once, up front, so "Moment nearby" can show on the lock screen later
askNotificationPermissionOnce();
// a "Moment nearby" repeat left on from an older version keeps going on the current schedule
updateNearbyRepeat();

export default function RootLayout() {
  // the splash screen stays up until Gaegu is ready, so text never flashes in the system font
  const fontsReady = useAppFonts();
  if (!fontsReady) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        {/* fade, so the map's big button appears to become the shutter in place */}
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        {/* the photo sits in the same frame on both screens, so a fade reads as the photo staying put */}
        <Stack.Screen name="edit" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        {/* full-screen overlay on top of everything; the map stays faintly visible behind it */}
        {/* no system transition: the post view animates itself (the photo grows out of its pin and lands back in it) */}
        <Stack.Screen name="post/[id]" options={{ presentation: 'transparentModal', animation: 'none' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
